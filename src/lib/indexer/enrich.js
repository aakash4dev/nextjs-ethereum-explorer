/**
 * Post-persist enrichment: token metadata, ETH and token balances, NFT owners,
 * contract detection. All reads are pinned to a block number so results are
 * consistent with what has been indexed.
 */
import { hexToString } from 'viem';
import { BYTES32_METADATA_ABI, ERC1155_ABI, ERC20_ABI, ERC721_ABI, MULTICALL3_ADDRESS } from '../abi.js';
import { getClient } from '../rpc.js';
import { Address, NftInstance, Token, TokenBalance } from '../models.js';
import { createLogger } from '../logger.js';

const log = createLogger('enrich');
const ZERO = '0x0000000000000000000000000000000000000000';
const CALL_CHUNK = 500;

let multicallAvailable = null;
async function hasMulticall() {
  if (multicallAvailable !== null) return multicallAvailable;
  try {
    const code = await getClient().getCode({ address: MULTICALL3_ADDRESS });
    multicallAvailable = Boolean(code && code !== '0x');
  } catch {
    multicallAvailable = false;
  }
  return multicallAvailable;
}

/** Run read calls with allowFailure semantics; returns values or null per call. */
export async function readMany(contracts, blockNumber) {
  const client = getClient();
  const out = [];
  const useMulticall = await hasMulticall();
  for (let i = 0; i < contracts.length; i += CALL_CHUNK) {
    const chunk = contracts.slice(i, i + CALL_CHUNK);
    const bn = blockNumber === undefined || blockNumber === null ? undefined : BigInt(blockNumber);
    if (useMulticall) {
      const res = await client.multicall({ contracts: chunk, allowFailure: true, multicallAddress: MULTICALL3_ADDRESS, blockNumber: bn });
      out.push(...res.map((r) => (r.status === 'success' ? r.result : null)));
    } else {
      const res = await Promise.all(chunk.map((c) => client.readContract({ ...c, blockNumber: bn }).catch(() => null)));
      out.push(...res);
    }
  }
  return out;
}

const cleanString = (s) => (typeof s === 'string' ? s.replace(/\u0000/g, '').trim().slice(0, 128) || null : null);

export async function refreshTokenMetadata(addresses, blockNumber, { force = false } = {}) {
  if (!addresses.length) return;
  const tokens = await Token.find({ address: { $in: addresses } }).lean();
  const stale = force ? tokens : tokens.filter((t) => !t.metadataFetchedAt);
  const fresh = force ? [] : tokens.filter((t) => t.metadataFetchedAt);

  // Metadata (name/symbol/decimals) once per token; totalSupply every time it moves.
  if (stale.length) {
    const calls = stale.flatMap((t) => {
      const abi = t.type === 'ERC1155' ? ERC1155_ABI : t.type === 'ERC721' ? ERC721_ABI : ERC20_ABI;
      return [
        { address: t.address, abi, functionName: 'name' },
        { address: t.address, abi, functionName: 'symbol' },
        t.type === 'ERC20' ? { address: t.address, abi: ERC20_ABI, functionName: 'decimals' } : null,
        t.type !== 'ERC1155' ? { address: t.address, abi, functionName: 'totalSupply' } : null,
      ];
    });
    const res = await readMany(calls.filter(Boolean), blockNumber);
    let k = 0;
    const needBytes32 = [];
    const ops = stale.map((t, i) => {
      const name = cleanString(res[k++]);
      const symbol = cleanString(res[k++]);
      const decimals = t.type === 'ERC20' ? res[k++] : null;
      const supply = t.type !== 'ERC1155' ? res[k++] : null;
      if (!name || !symbol) needBytes32.push(i);
      return {
        updateOne: {
          filter: { address: t.address },
          update: {
            $set: {
              name,
              symbol,
              decimals: t.type === 'ERC20' ? (decimals === null ? null : Number(decimals)) : 0,
              totalSupply: supply === null ? null : supply.toString(),
              totalSupplyNum: supply === null ? 0 : Number(supply),
              metadataFetchedAt: new Date(),
            },
          },
        },
      };
    });
    if (needBytes32.length) {
      const calls32 = needBytes32.flatMap((i) => [
        { address: stale[i].address, abi: BYTES32_METADATA_ABI, functionName: 'name' },
        { address: stale[i].address, abi: BYTES32_METADATA_ABI, functionName: 'symbol' },
      ]);
      const r32 = await readMany(calls32, blockNumber);
      needBytes32.forEach((i, j) => {
        const set = ops[i].updateOne.update.$set;
        const decode = (h) => {
          try {
            return h ? cleanString(hexToString(h, { size: 32 })) : null;
          } catch {
            return null;
          }
        };
        set.name = set.name ?? decode(r32[j * 2]);
        set.symbol = set.symbol ?? decode(r32[j * 2 + 1]);
      });
    }
    await Token.bulkWrite(ops, { ordered: false });
  }

  const supplyTokens = fresh.filter((t) => t.type !== 'ERC1155');
  if (supplyTokens.length) {
    const res = await readMany(
      supplyTokens.map((t) => ({ address: t.address, abi: ERC20_ABI, functionName: 'totalSupply' })),
      blockNumber,
    );
    await Token.bulkWrite(
      supplyTokens
        .map((t, i) => (res[i] === null ? null : { updateOne: { filter: { address: t.address }, update: { $set: { totalSupply: res[i].toString(), totalSupplyNum: Number(res[i]) } } } }))
        .filter(Boolean),
      { ordered: false },
    );
  }
}

/** @param pairs [{ token, holder, tokenId, tokenType }] */
export async function refreshTokenBalances(pairs, blockNumber) {
  const unique = new Map();
  for (const p of pairs) {
    if (!p.holder || p.holder === ZERO) continue;
    const tokenId = p.tokenType === 'ERC1155' ? String(p.tokenId) : '';
    unique.set(`${p.token}:${p.holder}:${tokenId}`, { ...p, tokenId });
  }
  const list = [...unique.values()];
  if (!list.length) return;
  const res = await readMany(
    list.map((p) =>
      p.tokenType === 'ERC1155'
        ? { address: p.token, abi: ERC1155_ABI, functionName: 'balanceOf', args: [p.holder, BigInt(p.tokenId)] }
        : { address: p.token, abi: ERC20_ABI, functionName: 'balanceOf', args: [p.holder] },
    ),
    blockNumber,
  );
  const ops = [];
  list.forEach((p, i) => {
    const bal = res[i];
    if (bal === null || bal === undefined) return;
    const filter = { token: p.token, holder: p.holder, tokenId: p.tokenId };
    if (bal === 0n) ops.push({ deleteOne: { filter } });
    else {
      ops.push({
        updateOne: {
          filter,
          update: { $set: { tokenType: p.tokenType, balance: bal.toString(), balanceNum: Number(bal), blockNumber } },
          upsert: true,
        },
      });
    }
  });
  if (ops.length) await TokenBalance.bulkWrite(ops, { ordered: false });
}

export async function refreshHolderCounts(tokens) {
  if (!tokens.length) return;
  const counts = await TokenBalance.aggregate([
    { $match: { token: { $in: tokens } } },
    { $group: { _id: '$token', holders: { $addToSet: '$holder' } } },
    { $project: { count: { $size: '$holders' } } },
  ]);
  const byToken = new Map(counts.map((c) => [c._id, c.count]));
  await Token.bulkWrite(
    tokens.map((t) => ({ updateOne: { filter: { address: t }, update: { $set: { holdersCount: byToken.get(t) ?? 0 } } } })),
    { ordered: false },
  );
}

export async function refreshAddressBalances(addresses, blockNumber) {
  const list = [...addresses];
  if (!list.length) return;
  const client = getClient();
  const balances = [];
  for (let i = 0; i < list.length; i += CALL_CHUNK) {
    const chunk = list.slice(i, i + CALL_CHUNK);
    balances.push(...(await Promise.all(chunk.map((address) => client.getBalance({ address, blockNumber: BigInt(blockNumber) }).catch(() => null)))));
  }
  const ops = [];
  list.forEach((address, i) => {
    if (balances[i] === null) return;
    ops.push({
      updateOne: {
        filter: { address, $or: [{ balanceBlock: null }, { balanceBlock: { $lte: blockNumber } }] },
        update: { $set: { balance: balances[i].toString(), balanceNum: Number(balances[i]) / 1e18, balanceBlock: blockNumber } },
      },
    });
  });
  if (ops.length) await Address.bulkWrite(ops, { ordered: false });
}

/** eth_getCode for transaction targets whose type is still unknown. */
export async function detectContracts(candidates, blockNumber) {
  const list = [...candidates];
  if (!list.length) return;
  const unknown = await Address.find({ address: { $in: list }, isContract: false, codeChecked: { $ne: true } }).select({ address: 1 }).lean();
  if (!unknown.length) return;
  const client = getClient();
  const codes = await Promise.all(unknown.map((a) => client.getCode({ address: a.address, blockNumber: BigInt(blockNumber) }).catch(() => undefined)));
  const ops = unknown
    .map((a, i) => (codes[i] === undefined ? null : {
      updateOne: { filter: { address: a.address }, update: { $set: { codeChecked: true, isContract: Boolean(codes[i] && codes[i] !== '0x' && !codes[i].startsWith('0xef0100')) } } },
    }))
    .filter(Boolean);
  if (ops.length) await Address.bulkWrite(ops, { ordered: false });
}

/** Re-read ERC-721 owners whose last transfer was rolled back by a reorg. */
export async function refreshNftOwners(instances, blockNumber) {
  if (!instances.length) return;
  const owners = await readMany(
    instances.map((n) => ({ address: n.token, abi: ERC721_ABI, functionName: 'ownerOf', args: [BigInt(n.tokenId)] })),
    blockNumber,
  );
  await NftInstance.bulkWrite(
    instances.map((n, i) => ({
      updateOne: { filter: { token: n.token, tokenId: n.tokenId, lastSeq: -1 }, update: { $set: { owner: owners[i]?.toLowerCase?.() ?? null } } },
    })),
    { ordered: false },
  );
}

/** Run all enrichment for a persisted batch. Failures are logged, never fatal. */
export async function enrichBatch(batch, { trackBalances, trackTokenBalances }) {
  const end = batch[batch.length - 1].block.number;
  const tokens = new Set();
  const pairs = [];
  const balanceTouches = new Set();
  const codeCandidates = new Set();
  for (const b of batch) {
    for (const t of b.tokens.keys()) tokens.add(t);
    for (const t of b.tokenTransfers) {
      pairs.push({ token: t.token, holder: t.from, tokenId: t.tokenId, tokenType: t.tokenType });
      pairs.push({ token: t.token, holder: t.to, tokenId: t.tokenId, tokenType: t.tokenType });
    }
    for (const a of b.balanceTouches) balanceTouches.add(a);
    for (const a of b.codeCandidates) codeCandidates.add(a);
  }

  const steps = [
    ['contracts', () => detectContracts(codeCandidates, end)],
    ['tokenMetadata', () => refreshTokenMetadata([...tokens], end)],
  ];
  if (trackTokenBalances) {
    steps.push(['tokenBalances', async () => {
      await refreshTokenBalances(pairs, end);
      await refreshHolderCounts([...tokens]);
    }]);
  }
  if (trackBalances) steps.push(['balances', () => refreshAddressBalances(balanceTouches, end)]);

  for (const [name, fn] of steps) {
    try {
      await fn();
    } catch (err) {
      log.warn(`enrichment step "${name}" failed`, { toBlock: end, err });
    }
  }
}
