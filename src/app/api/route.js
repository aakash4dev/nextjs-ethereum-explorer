/**
 * Etherscan-compatible API (`/api?module=...&action=...`).
 *
 * Lets existing tooling work against this explorer unchanged, e.g. Hardhat
 * (`@nomicfoundation/hardhat-verify` customChains apiURL), Foundry
 * (`forge verify-contract --verifier etherscan --verifier-url <site>/api`),
 * ethers' EtherscanProvider and scripts written for Etherscan.
 */
import { json, rateLimit, readBody } from '@/lib/api';
import { dbConnect } from '@/lib/db';
import { getClient, rpc } from '@/lib/rpc';
import { Address, Block, Contract, InternalTx, Log, Token, TokenBalance, TokenTransfer, Transaction, Withdrawal } from '@/lib/models';
import { ERC20_ABI } from '@/lib/abi';
import { isAddress, isHash } from '@/lib/validation';
import { getBlockByTime } from '@/lib/services/blocks';
import { getGasOracle } from '@/lib/services/gas';
import { getNativePrice } from '@/lib/services/market';
import { safeHead } from '@/lib/services/common';
import { methodNames } from '@/lib/signatures';
import { getVerificationJob, submitVerificationJob } from '@/lib/verification/verify';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const log = createLogger('etherscan-api');
const MAX_RECORDS = 10_000;

class ApiError extends Error {}

const ok = (result, message = 'OK') => json({ status: '1', message, result });
const notOk = (result, message = 'NOTOK') => json({ status: '0', message, result });
const empty = (what = 'transactions') => notOk([], `No ${what} found`);
const s = (v) => (v === null || v === undefined ? '' : String(v));
const ts = (d) => s(Math.floor(new Date(d).getTime() / 1000));

function addr(p, name = 'address') {
  const v = p[name];
  if (!isAddress(v ?? '')) throw new ApiError(`Error! Invalid ${name} format`);
  return v.toLowerCase();
}

function paging(p) {
  const page = Math.max(1, Number.parseInt(p.page ?? '1', 10) || 1);
  const offset = Math.min(MAX_RECORDS, Math.max(1, Number.parseInt(p.offset ?? String(MAX_RECORDS), 10) || MAX_RECORDS));
  if (page * offset > MAX_RECORDS) throw new ApiError('Result window is too large, PageNo x Offset size must be less than or equal to 10000');
  return { skip: (page - 1) * offset, limit: offset };
}

function blockRange(p) {
  const start = Number.parseInt(p.startblock ?? p.fromBlock ?? '0', 10) || 0;
  const endRaw = p.endblock ?? p.toBlock;
  const end = endRaw === undefined || endRaw === 'latest' ? Number.MAX_SAFE_INTEGER : Number.parseInt(endRaw, 10);
  return { $gte: start, $lte: Number.isFinite(end) ? end : Number.MAX_SAFE_INTEGER };
}

const sortDir = (p) => (p.sort === 'desc' ? -1 : 1);

async function txRows(filter, p) {
  const { skip, limit } = paging(p);
  const d = sortDir(p);
  return Transaction.find(filter).sort({ blockNumber: d, transactionIndex: d }).skip(skip).limit(limit).lean();
}

async function formatTxs(rows) {
  const head = await safeHead();
  const names = await methodNames(rows.map((r) => r.methodId));
  return rows.map((t) => ({
    blockNumber: s(t.blockNumber),
    timeStamp: ts(t.timestamp),
    hash: t.hash,
    nonce: s(t.nonce),
    blockHash: t.blockHash,
    transactionIndex: s(t.transactionIndex),
    from: t.from,
    to: s(t.to),
    value: t.value,
    gas: s(t.gas),
    gasPrice: s(t.effectiveGasPrice ?? t.gasPrice),
    isError: t.status === 0 ? '1' : '0',
    txreceipt_status: t.status === null ? '' : s(t.status),
    input: t.input,
    contractAddress: s(t.contractAddress),
    cumulativeGasUsed: s(t.cumulativeGasUsed),
    gasUsed: s(t.gasUsed),
    confirmations: head === null ? '' : s(head - t.blockNumber + 1),
    methodId: t.methodId ?? '0x',
    functionName: t.methodId && names[t.methodId] ? `${names[t.methodId]}()` : '',
  }));
}

async function formatTokenTxs(rows) {
  const head = await safeHead();
  const tokens = await Token.find({ address: { $in: [...new Set(rows.map((r) => r.token))] } }).lean();
  const byAddr = new Map(tokens.map((t) => [t.address, t]));
  const txs = await Transaction.find({ hash: { $in: [...new Set(rows.map((r) => r.txHash))] } }).select({ hash: 1, nonce: 1, blockHash: 1, transactionIndex: 1, gas: 1, gasPrice: 1, effectiveGasPrice: 1, gasUsed: 1, cumulativeGasUsed: 1, input: 1 }).lean();
  const txByHash = new Map(txs.map((t) => [t.hash, t]));
  return rows.map((r) => {
    const t = byAddr.get(r.token) ?? {};
    const tx = txByHash.get(r.txHash) ?? {};
    const row = {
      blockNumber: s(r.blockNumber),
      timeStamp: ts(r.timestamp),
      hash: r.txHash,
      nonce: s(tx.nonce),
      blockHash: s(tx.blockHash),
      from: r.from,
      contractAddress: r.token,
      to: r.to,
      tokenName: s(t.name),
      tokenSymbol: s(t.symbol),
      transactionIndex: s(tx.transactionIndex),
      gas: s(tx.gas),
      gasPrice: s(tx.effectiveGasPrice ?? tx.gasPrice),
      gasUsed: s(tx.gasUsed),
      cumulativeGasUsed: s(tx.cumulativeGasUsed),
      input: 'deprecated',
      confirmations: head === null ? '' : s(head - r.blockNumber + 1),
    };
    if (r.tokenType === 'ERC20') return { ...row, value: r.value, tokenDecimal: s(t.decimals) };
    if (r.tokenType === 'ERC721') return { ...row, tokenID: r.tokenId, tokenDecimal: '0' };
    return { ...row, tokenID: r.tokenId, tokenValue: r.value };
  });
}

const PROXY_METHODS = {
  eth_blockNumber: () => [],
  eth_getBlockByNumber: (p) => [p.tag, p.boolean === 'true'],
  eth_getBlockTransactionCountByNumber: (p) => [p.tag],
  eth_getTransactionByHash: (p) => [p.txhash],
  eth_getTransactionByBlockNumberAndIndex: (p) => [p.tag, p.index],
  eth_getTransactionCount: (p) => [p.address, p.tag ?? 'latest'],
  eth_sendRawTransaction: (p) => [p.hex],
  eth_getTransactionReceipt: (p) => [p.txhash],
  eth_call: (p) => [{ to: p.to, data: p.data }, p.tag ?? 'latest'],
  eth_getCode: (p) => [p.address, p.tag ?? 'latest'],
  eth_getStorageAt: (p) => [p.address, p.position, p.tag ?? 'latest'],
  eth_gasPrice: () => [],
  eth_estimateGas: (p) => [{ to: p.to, data: p.data, value: p.value, gas: p.gas, gasPrice: p.gasPrice }],
  eth_chainId: () => [],
  eth_maxPriorityFeePerGas: () => [],
};

const handlers = {
  account: {
    async balance(p) {
      const list = String(p.address ?? '').split(',').filter(Boolean);
      if (list.length > 1) return handlers.account.balancemulti(p);
      const a = addr(p);
      return ok((await getClient().getBalance({ address: a })).toString());
    },
    async balancemulti(p) {
      const list = String(p.address ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
      if (!list.length || !list.every(isAddress)) throw new ApiError('Error! Invalid address format');
      const bals = await Promise.all(list.map((a) => getClient().getBalance({ address: a })));
      return ok(list.map((a, i) => ({ account: a, balance: bals[i].toString() })));
    },
    async txlist(p) {
      const a = addr(p);
      const rows = await txRows({ $or: [{ from: a }, { to: a }, { contractAddress: a }], blockNumber: blockRange(p) }, p);
      return rows.length ? ok(await formatTxs(rows)) : empty();
    },
    async txlistinternal(p) {
      const filter = { blockNumber: blockRange(p) };
      if (p.txhash) {
        if (!isHash(p.txhash)) throw new ApiError('Error! Invalid txhash format');
        filter.txHash = p.txhash.toLowerCase();
      } else filter.$or = [{ from: addr(p) }, { to: addr(p) }];
      const { skip, limit } = paging(p);
      const rows = await InternalTx.find(filter).sort({ blockNumber: sortDir(p), traceAddress: 1 }).skip(skip).limit(limit).lean();
      if (!rows.length) return empty();
      return ok(rows.map((r) => ({
        blockNumber: s(r.blockNumber), timeStamp: ts(r.timestamp), hash: r.txHash, from: s(r.from), to: r.type?.startsWith('create') ? '' : s(r.to),
        value: r.value, contractAddress: r.type?.startsWith('create') ? s(r.to) : '', input: '', type: r.callType ?? r.type, gas: s(r.gas), gasUsed: s(r.gasUsed),
        traceId: r.traceAddress.replace(/\./g, '_'), isError: r.error ? '1' : '0', errCode: s(r.error),
      })));
    },
    async tokentx(p) {
      return handlers.account._tokens(p, 'ERC20');
    },
    async tokennfttx(p) {
      return handlers.account._tokens(p, 'ERC721');
    },
    async token1155tx(p) {
      return handlers.account._tokens(p, 'ERC1155');
    },
    async _tokens(p, type) {
      const filter = { tokenType: type, blockNumber: blockRange(p) };
      if (p.contractaddress) filter.token = addr(p, 'contractaddress');
      if (p.address) filter.$or = [{ from: addr(p) }, { to: addr(p) }];
      if (!filter.token && !filter.$or) throw new ApiError('Error! Missing address or contractaddress');
      const { skip, limit } = paging(p);
      const rows = await TokenTransfer.find(filter).sort({ blockNumber: sortDir(p), logIndex: sortDir(p) }).skip(skip).limit(limit).lean();
      return rows.length ? ok(await formatTokenTxs(rows)) : empty();
    },
    async getminedblocks(p) {
      const a = addr(p);
      const { skip, limit } = paging(p);
      const rows = await Block.find({ miner: a }).sort({ number: -1 }).skip(skip).limit(limit).lean();
      if (!rows.length) return empty('blocks');
      return ok(rows.map((b) => ({ blockNumber: s(b.number), timeStamp: ts(b.timestamp), blockReward: b.priorityFees })));
    },
    async txsBeaconWithdrawal(p) {
      const a = addr(p);
      const { skip, limit } = paging(p);
      const rows = await Withdrawal.find({ address: a, blockNumber: blockRange(p) }).sort({ index: sortDir(p) }).skip(skip).limit(limit).lean();
      if (!rows.length) return empty('withdrawals');
      return ok(rows.map((w) => ({ withdrawalIndex: s(w.index), validatorIndex: s(w.validatorIndex), address: w.address, amount: s(BigInt(w.amount) / 1_000_000_000n), blockNumber: s(w.blockNumber), timestamp: ts(w.timestamp) })));
    },
    async tokenbalance(p) {
      const token = addr(p, 'contractaddress');
      const a = addr(p);
      const bal = await getClient().readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [a] });
      return ok(bal.toString());
    },
  },
  contract: {
    async getabi(p) {
      const c = await Contract.findOne({ address: addr(p) }).select({ abi: 1 }).lean();
      return c ? ok(JSON.stringify(c.abi)) : notOk('Contract source code not verified');
    },
    async getsourcecode(p) {
      const a = addr(p);
      const c = await Contract.findOne({ address: a }).lean();
      if (!c) {
        return ok([{ SourceCode: '', ABI: 'Contract source code not verified', ContractName: '', CompilerVersion: '', OptimizationUsed: '', Runs: '', ConstructorArguments: '', EVMVersion: '', Library: '', LicenseType: '', Proxy: '0', Implementation: '', SwarmSource: '' }]);
      }
      const multi = c.sourceFiles.length > 1 || c.settings?.remappings;
      const source = multi
        ? `{${JSON.stringify({ language: 'Solidity', sources: Object.fromEntries(c.sourceFiles.map((f) => [f.path, { content: f.content }])), settings: c.settings })}}`
        : c.sourceFiles[0]?.content ?? '';
      return ok([{
        SourceCode: source, ABI: JSON.stringify(c.abi), ContractName: c.name, CompilerVersion: c.compilerVersion,
        OptimizationUsed: c.optimizationUsed ? '1' : '0', Runs: s(c.runs), ConstructorArguments: c.constructorArguments ?? '',
        EVMVersion: c.evmVersion ?? 'Default', Library: Object.entries(c.libraries ?? {}).map(([k, v]) => `${k.split(':').pop()}:${v}`).join(';'),
        LicenseType: c.licenseType ?? '', Proxy: '0', Implementation: '', SwarmSource: '',
      }]);
    },
    async getcontractcreation(p) {
      const list = String(p.contractaddresses ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 5);
      if (!list.length || !list.every(isAddress)) throw new ApiError('Error! Invalid contractaddresses format');
      const rows = await Address.find({ address: { $in: list }, creator: { $ne: null } }).lean();
      if (!rows.length) return notOk(null, 'No data found');
      return ok(rows.map((r) => ({ contractAddress: r.address, contractCreator: r.creator, txHash: r.creationTxHash, blockNumber: s(r.creationBlock) })));
    },
    async verifysourcecode(p) {
      addr(p, 'contractaddress');
      if (!p.sourceCode) throw new ApiError('Missing sourceCode');
      const guid = await submitVerificationJob(p);
      return ok(guid);
    },
    async checkverifystatus(p) {
      const job = await getVerificationJob(p.guid);
      if (!job) return notOk('Unable to locate GUID');
      if (job.status === 'pending') return notOk('Pending in queue');
      if (job.status === 'pass') return ok(job.message.startsWith('Already') ? 'Already Verified' : 'Pass - Verified');
      return notOk(job.message);
    },
  },
  transaction: {
    async getstatus(p) {
      if (!isHash(p.txhash ?? '')) throw new ApiError('Error! Invalid txhash format');
      const r = await rpc('eth_getTransactionReceipt', [p.txhash]);
      return ok({ isError: r && r.status === '0x0' ? '1' : '0', errDescription: r && r.status === '0x0' ? 'Reverted' : '' });
    },
    async gettxreceiptstatus(p) {
      if (!isHash(p.txhash ?? '')) throw new ApiError('Error! Invalid txhash format');
      const r = await rpc('eth_getTransactionReceipt', [p.txhash]);
      return ok({ status: r ? s(Number(BigInt(r.status ?? '0x1'))) : '' });
    },
  },
  block: {
    async getblockreward(p) {
      const n = Number.parseInt(p.blockno, 10);
      const b = await Block.findOne({ number: n }).lean();
      if (!b) return notOk('Block not indexed');
      return ok({ blockNumber: s(b.number), timeStamp: ts(b.timestamp), blockMiner: b.miner, blockReward: b.priorityFees, uncles: [], uncleInclusionReward: '0' });
    },
    async getblocknobytime(p) {
      const t = Number.parseInt(p.timestamp, 10);
      if (!Number.isFinite(t)) throw new ApiError('Error! Invalid timestamp');
      const b = await getBlockByTime(t, p.closest === 'after' ? 'after' : 'before');
      return b ? ok(s(b.number)) : notOk('Error! No closest block found');
    },
  },
  logs: {
    async getLogs(p) {
      const filter = { blockNumber: blockRange(p) };
      if (p.address) filter.address = addr(p);
      const topics = [0, 1, 2, 3].map((i) => p[`topic${i}`]?.toLowerCase());
      const conds = topics.map((t, i) => (t ? { [`topic${i}`]: t } : null));
      // topicX_Y_opr = and|or between consecutive topics (Etherscan semantics, default and).
      let clause = null;
      for (let i = 0; i < 4; i++) {
        if (!conds[i]) continue;
        if (!clause) {
          clause = conds[i];
          continue;
        }
        const prev = [...Array(i).keys()].reverse().find((j) => conds[j]);
        const op = p[`topic${prev}_${i}_opr`] === 'or' ? '$or' : '$and';
        clause = { [op]: [clause, conds[i]] };
      }
      if (clause) Object.assign(filter, clause.$or ? { $or: clause.$or } : clause.$and ? { $and: clause.$and } : clause);
      if (!filter.address && !clause) throw new ApiError('Error! Missing address or topic filter');
      const { skip, limit } = paging({ ...p, offset: p.offset ?? '1000' });
      const rows = await Log.find(filter).sort({ blockNumber: 1, logIndex: 1 }).skip(skip).limit(limit).lean();
      if (!rows.length) return empty('records');
      const hex = (n) => `0x${Number(n).toString(16)}`;
      return ok(rows.map((l) => ({
        address: l.address, topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean), data: l.data,
        blockNumber: hex(l.blockNumber), blockHash: l.blockHash, timeStamp: hex(Math.floor(new Date(l.timestamp).getTime() / 1000)),
        gasPrice: '', gasUsed: '', logIndex: hex(l.logIndex), transactionHash: l.txHash, transactionIndex: hex(l.transactionIndex),
      })));
    },
  },
  gastracker: {
    async gasoracle() {
      const o = await getGasOracle();
      const gwei = (w) => (Number(w) / 1e9).toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
      return ok({
        LastBlock: s(o.lastBlock), SafeGasPrice: gwei(o.slow.gasPrice), ProposeGasPrice: gwei(o.standard.gasPrice), FastGasPrice: gwei(o.fast.gasPrice),
        suggestBaseFee: o.nextBaseFee ? gwei(o.nextBaseFee) : '0', gasUsedRatio: o.history.map((h) => h.gasUsedRatio).join(','),
      });
    },
    async gasestimate(p) {
      const price = BigInt(p.gasprice ?? '0');
      const o = await getGasOracle();
      const tiers = ['fast', 'standard', 'slow'];
      const tier = tiers.find((t) => price >= BigInt(o[t].gasPrice)) ?? null;
      return ok(s(tier ? o[tier].waitSeconds : 3600));
    },
  },
  stats: {
    async ethprice() {
      const price = await getNativePrice();
      if (!price) return notOk('Price feed unavailable');
      const now = s(Math.floor(Date.now() / 1000));
      return ok({ ethbtc: s(price.btc), ethbtc_timestamp: now, ethusd: s(price.usd), ethusd_timestamp: now });
    },
  },
  token: {
    async tokeninfo(p) {
      const t = await Token.findOne({ address: addr(p, 'contractaddress') }).lean();
      if (!t) return notOk('Token not found');
      return ok([{ contractAddress: t.address, tokenName: s(t.name), symbol: s(t.symbol), divisor: s(t.decimals), tokenType: t.type, totalSupply: s(t.totalSupply), holdersCount: s(t.holdersCount) }]);
    },
    async tokenholderlist(p) {
      const token = addr(p, 'contractaddress');
      const { skip, limit } = paging({ ...p, offset: p.offset ?? '100' });
      const rows = await TokenBalance.find({ token }).sort({ balanceNum: -1 }).skip(skip).limit(limit).lean();
      return rows.length ? ok(rows.map((r) => ({ TokenHolderAddress: r.holder, TokenHolderQuantity: r.balance }))) : empty('holders');
    },
  },
};

async function handle(req, params) {
  const rl = rateLimit(req);
  if (rl?.limited) return json({ status: '0', message: 'NOTOK', result: 'Max rate limit reached' }, { status: 429, headers: rl.headers });
  const mod = String(params.module ?? '');
  const action = String(params.action ?? '');
  try {
    if (mod === 'proxy') {
      const build = PROXY_METHODS[action];
      if (!build) return json({ jsonrpc: '2.0', id: Number(params.id ?? 1), error: { code: -32601, message: 'Unsupported proxy action' } });
      try {
        const result = await rpc(action, build(params));
        return json({ jsonrpc: '2.0', id: Number(params.id ?? 1), result });
      } catch (err) {
        return json({ jsonrpc: '2.0', id: Number(params.id ?? 1), error: { code: -32000, message: err.details ?? err.shortMessage ?? err.message } });
      }
    }
    const fn = handlers[mod]?.[action];
    if (!fn || action.startsWith('_')) return notOk('Error! Missing Or invalid Module name / Action name');
    await dbConnect();
    return await fn(params);
  } catch (err) {
    if (err instanceof ApiError) return notOk(err.message);
    log.error('etherscan api error', { module: mod, action, err });
    return notOk(process.env.NODE_ENV === 'production' ? 'Error! Internal error' : `Error! ${err.message}`);
  }
}

export async function GET(req) {
  return handle(req, Object.fromEntries(new URL(req.url).searchParams));
}

export async function POST(req) {
  const query = Object.fromEntries(new URL(req.url).searchParams);
  const body = await readBody(req).catch(() => ({}));
  return handle(req, { ...query, ...body });
}
