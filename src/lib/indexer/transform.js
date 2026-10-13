/**
 * Pure transformation of raw JSON-RPC payloads (block with full transactions,
 * receipts, normalised traces) into the documents persisted by the indexer.
 * No I/O here, which keeps it fully unit-testable.
 */
import { TOPICS } from '../abi.js';
import { selectInternalTransactions } from './traces.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const big = (h) => (h === undefined || h === null ? null : BigInt(h));
const num = (h) => (h === undefined || h === null ? null : Number(BigInt(h)));
const dec = (h) => (h === undefined || h === null ? null : BigInt(h).toString());
const lower = (a) => (a ? a.toLowerCase() : null);
const topicToAddress = (t) => (t ? `0x${t.slice(26)}`.toLowerCase() : null);

function decodeUintArray(data, offsetWord) {
  // ABI-encoded dynamic uint256[] located at byte offset stored in word `offsetWord`.
  const hex = data.slice(2);
  const word = (i) => BigInt(`0x${hex.slice(i * 64, i * 64 + 64) || '0'}`);
  const start = Number(word(offsetWord)) / 32;
  const len = Number(word(start));
  return Array.from({ length: len }, (_, i) => word(start + 1 + i));
}

/** Decode ERC-20 / ERC-721 / ERC-1155 transfers from a receipt log. */
export function decodeTokenTransfers(log) {
  const topics = log.topics ?? [];
  const t0 = topics[0]?.toLowerCase();
  const data = log.data ?? '0x';
  const base = { token: lower(log.address), logIndex: num(log.logIndex) };
  try {
    if (t0 === TOPICS.TRANSFER) {
      if (topics.length === 3 && data.length === 66) {
        return [{ ...base, batchIndex: 0, tokenType: 'ERC20', from: topicToAddress(topics[1]), to: topicToAddress(topics[2]), value: BigInt(data).toString(), tokenId: null }];
      }
      if (topics.length === 4 && (data === '0x' || data.length === 2)) {
        return [{ ...base, batchIndex: 0, tokenType: 'ERC721', from: topicToAddress(topics[1]), to: topicToAddress(topics[2]), value: '1', tokenId: BigInt(topics[3]).toString() }];
      }
      return [];
    }
    if (t0 === TOPICS.TRANSFER_SINGLE && topics.length === 4 && data.length >= 130) {
      const hex = data.slice(2);
      return [{
        ...base,
        batchIndex: 0,
        tokenType: 'ERC1155',
        operator: topicToAddress(topics[1]),
        from: topicToAddress(topics[2]),
        to: topicToAddress(topics[3]),
        tokenId: BigInt(`0x${hex.slice(0, 64)}`).toString(),
        value: BigInt(`0x${hex.slice(64, 128)}`).toString(),
      }];
    }
    if (t0 === TOPICS.TRANSFER_BATCH && topics.length === 4) {
      const ids = decodeUintArray(data, 0);
      const values = decodeUintArray(data, 1);
      return ids.map((id, i) => ({
        ...base,
        batchIndex: i,
        tokenType: 'ERC1155',
        operator: topicToAddress(topics[1]),
        from: topicToAddress(topics[2]),
        to: topicToAddress(topics[3]),
        tokenId: id.toString(),
        value: (values[i] ?? 0n).toString(),
      }));
    }
  } catch {
    // Malformed / non-standard event that merely shares a topic; ignore.
  }
  return [];
}

/**
 * @param {object} rawBlock eth_getBlockByNumber(n, true) result
 * @param {object[]} receipts receipts in transaction order
 * @param {object[]|null} frames normalised trace frames for the block (or null)
 */
export function transformBlock(rawBlock, receipts, frames = null) {
  const number = num(rawBlock.number);
  const timestamp = new Date(num(rawBlock.timestamp) * 1000);
  const baseFee = big(rawBlock.baseFeePerGas);
  const receiptByHash = new Map((receipts ?? []).map((r) => [r.transactionHash.toLowerCase(), r]));

  const transactions = [];
  const logs = [];
  const tokenTransfers = [];
  const addresses = new Map(); // address -> { isContract?, creator?, creationTxHash? }
  const touch = (a, extra) => {
    if (!a) return;
    const k = a.toLowerCase();
    addresses.set(k, { ...(addresses.get(k) ?? {}), ...(extra ?? {}) });
  };
  const codeCandidates = new Set();
  const tokens = new Map(); // token -> type
  const balanceTouches = new Set(); // address whose ETH balance changed
  let burnt = 0n;
  let priority = 0n;

  touch(rawBlock.miner);
  balanceTouches.add(lower(rawBlock.miner));

  for (const tx of rawBlock.transactions ?? []) {
    if (typeof tx === 'string') throw new Error('transformBlock requires full transaction objects');
    const hash = tx.hash.toLowerCase();
    const receipt = receiptByHash.get(hash);
    if (!receipt) throw new Error(`missing receipt for ${hash} in block ${number}`);

    const gasUsed = big(receipt.gasUsed) ?? 0n;
    const effectiveGasPrice = big(receipt.effectiveGasPrice) ?? big(tx.gasPrice) ?? 0n;
    const fee = gasUsed * effectiveGasPrice;
    const burntFee = baseFee !== null ? gasUsed * baseFee : 0n;
    const blobGasUsed = big(receipt.blobGasUsed);
    const blobGasPrice = big(receipt.blobGasPrice);
    burnt += burntFee + (blobGasUsed && blobGasPrice ? blobGasUsed * blobGasPrice : 0n);
    priority += fee - burntFee;

    const from = lower(tx.from);
    const to = lower(tx.to);
    const contractAddress = lower(receipt.contractAddress);
    const input = tx.input ?? tx.data ?? '0x';
    const value = big(tx.value) ?? 0n;

    transactions.push({
      hash,
      blockNumber: number,
      blockHash: rawBlock.hash.toLowerCase(),
      timestamp,
      transactionIndex: num(tx.transactionIndex),
      from,
      to,
      value: value.toString(),
      valueNum: Number(value) / 1e18,
      gas: num(tx.gas),
      gasPrice: dec(tx.gasPrice),
      maxFeePerGas: dec(tx.maxFeePerGas),
      maxPriorityFeePerGas: dec(tx.maxPriorityFeePerGas),
      maxFeePerBlobGas: dec(tx.maxFeePerBlobGas),
      blobVersionedHashes: tx.blobVersionedHashes?.length ? tx.blobVersionedHashes : undefined,
      nonce: num(tx.nonce),
      input,
      methodId: to && input.length >= 10 ? input.slice(0, 10).toLowerCase() : null,
      status: receipt.status === undefined || receipt.status === null ? null : num(receipt.status),
      contractAddress,
      cumulativeGasUsed: num(receipt.cumulativeGasUsed),
      gasUsed: Number(gasUsed),
      effectiveGasPrice: effectiveGasPrice.toString(),
      fee: fee.toString(),
      burntFee: burntFee.toString(),
      blobGasUsed: blobGasUsed === null ? null : Number(blobGasUsed),
      blobGasPrice: blobGasPrice === null ? null : blobGasPrice.toString(),
      type: num(tx.type) ?? 0,
      chainId: num(tx.chainId),
      v: tx.v ?? null,
      r: tx.r ?? null,
      s: tx.s ?? null,
      yParity: num(tx.yParity),
      accessList: tx.accessList?.length ? tx.accessList : undefined,
      authorizationList: tx.authorizationList?.length ? tx.authorizationList : undefined,
      logsCount: receipt.logs?.length ?? 0,
    });

    touch(from);
    balanceTouches.add(from);
    if (to) {
      touch(to);
      if (value > 0n) balanceTouches.add(to);
      if (input !== '0x') codeCandidates.add(to);
    }
    if (contractAddress) {
      touch(contractAddress, { isContract: true, creator: from, creationTxHash: hash, creationBlock: number });
      balanceTouches.add(contractAddress);
    }

    for (const lg of receipt.logs ?? []) {
      const topics = lg.topics ?? [];
      const address = lower(lg.address);
      const logIndex = num(lg.logIndex);
      logs.push({
        txHash: hash,
        blockNumber: number,
        blockHash: rawBlock.hash.toLowerCase(),
        transactionIndex: num(tx.transactionIndex),
        logIndex,
        address,
        topic0: topics[0]?.toLowerCase() ?? null,
        topic1: topics[1]?.toLowerCase() ?? null,
        topic2: topics[2]?.toLowerCase() ?? null,
        topic3: topics[3]?.toLowerCase() ?? null,
        data: lg.data ?? '0x',
        timestamp,
      });
      touch(address, { isContract: true });

      for (const t of decodeTokenTransfers(lg)) {
        tokenTransfers.push({ ...t, txHash: hash, blockNumber: number, timestamp });
        if (!tokens.has(t.token)) tokens.set(t.token, t.tokenType);
        touch(t.from);
        touch(t.to);
      }
    }
  }

  // Internal transactions from traces.
  const internalTxs = [];
  let internalTxCount = 0;
  if (frames) {
    const txIndex = new Map(transactions.map((t) => [t.hash, t]));
    for (const f of frames) {
      if (f.depth >= 1) internalTxCount += 1;
      if ((f.type === 'create' || f.type === 'create2') && f.to && !f.error) {
        touch(f.to, { isContract: true, creator: f.from, creationTxHash: f.txHash, creationBlock: number });
      }
    }
    for (const f of selectInternalTransactions(frames)) {
      if (!txIndex.has(f.txHash)) continue;
      internalTxs.push({
        txHash: f.txHash,
        blockNumber: number,
        timestamp,
        traceAddress: f.traceAddress,
        type: f.type,
        callType: f.callType,
        from: f.from,
        to: f.to,
        value: f.value,
        gas: f.gas,
        gasUsed: f.gasUsed,
        input: f.input && f.input.length > 10 ? f.input.slice(0, 10) : f.input,
        error: f.error,
      });
      touch(f.from);
      touch(f.to);
      if (!f.error && f.value !== '0') {
        balanceTouches.add(f.from);
        balanceTouches.add(f.to);
      }
    }
  }

  const withdrawals = (rawBlock.withdrawals ?? []).map((w) => ({
    index: num(w.index),
    blockNumber: number,
    validatorIndex: num(w.validatorIndex),
    address: lower(w.address),
    amount: ((big(w.amount) ?? 0n) * 1_000_000_000n).toString(),
    timestamp,
  }));
  for (const w of withdrawals) {
    touch(w.address);
    balanceTouches.add(w.address);
  }

  const block = {
    number,
    hash: rawBlock.hash.toLowerCase(),
    parentHash: rawBlock.parentHash.toLowerCase(),
    timestamp,
    miner: lower(rawBlock.miner),
    gasUsed: num(rawBlock.gasUsed) ?? 0,
    gasLimit: num(rawBlock.gasLimit) ?? 0,
    baseFeePerGas: baseFee === null ? null : baseFee.toString(),
    burntFees: burnt.toString(),
    priorityFees: priority.toString(),
    transactionCount: transactions.length,
    internalTxCount,
    size: num(rawBlock.size),
    extraData: rawBlock.extraData,
    difficulty: dec(rawBlock.difficulty),
    totalDifficulty: dec(rawBlock.totalDifficulty),
    nonce: rawBlock.nonce ?? null,
    mixHash: rawBlock.mixHash ?? null,
    sha3Uncles: rawBlock.sha3Uncles ?? null,
    uncles: rawBlock.uncles ?? [],
    stateRoot: rawBlock.stateRoot,
    transactionsRoot: rawBlock.transactionsRoot,
    receiptsRoot: rawBlock.receiptsRoot,
    logsBloom: rawBlock.logsBloom,
    withdrawalsRoot: rawBlock.withdrawalsRoot ?? null,
    withdrawalCount: withdrawals.length,
    blobGasUsed: num(rawBlock.blobGasUsed),
    excessBlobGas: num(rawBlock.excessBlobGas),
    parentBeaconBlockRoot: rawBlock.parentBeaconBlockRoot ?? null,
    requestsHash: rawBlock.requestsHash ?? null,
    indexedAt: new Date(),
  };

  addresses.delete(null);
  balanceTouches.delete(null);
  balanceTouches.delete(ZERO_ADDRESS);

  return {
    block,
    transactions,
    logs,
    tokenTransfers,
    internalTxs,
    withdrawals,
    addresses,
    codeCandidates,
    tokens,
    balanceTouches,
  };
}
