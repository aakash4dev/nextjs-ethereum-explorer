import { Address, Block, InternalTx, Log, Token, TokenTransfer, Transaction, Withdrawal } from '../models.js';
import { getClient } from '../rpc.js';
import { getLabel } from '../labels.js';
import { decodeLog } from '../decoder.js';
import { NO_ID, addressMeta, boundedCount, cached, chainId, paginate } from './common.js';
import { detectProxy, getVerifiedContract } from './contracts.js';
import { getAddressTokenHoldings } from './tokens.js';
import { getNativePrice } from './market.js';

/** Overview for the address page: live chain state + indexed facts. */
export async function getAddressOverview(address) {
  const client = getClient();
  const [balance, nonce, code, record, cid, price] = await Promise.all([
    client.getBalance({ address }).catch(() => null),
    client.getTransactionCount({ address }).catch(() => null),
    client.getCode({ address }).catch(() => null),
    Address.findOne({ address }).select(NO_ID).lean(),
    chainId(),
    getNativePrice(),
  ]);
  const delegation = code?.startsWith('0xef0100') ? `0x${code.slice(8, 48)}` : null; // EIP-7702
  const isContract = Boolean(code && code !== '0x' && !delegation) || Boolean(record?.isContract && !code);

  const filter = { $or: [{ from: address }, { to: address }, { contractAddress: address }] };
  const [txCount, firstTx, lastTx, token, verified, proxy, holdings, internalCount, transferCount, withdrawalCount, minedCount] = await Promise.all([
    boundedCount(Transaction, filter),
    Transaction.findOne({ from: address }).sort({ blockNumber: 1, transactionIndex: 1 }).select({ ...NO_ID, hash: 1, blockNumber: 1, timestamp: 1 }).lean(),
    Transaction.findOne(filter).sort({ blockNumber: -1, transactionIndex: -1 }).select({ ...NO_ID, hash: 1, blockNumber: 1, timestamp: 1 }).lean(),
    Token.findOne({ address }).select(NO_ID).lean(),
    isContract ? getVerifiedContract(address) : null,
    isContract ? detectProxy(address) : null,
    getAddressTokenHoldings(address),
    boundedCount(InternalTx, { $or: [{ from: address }, { to: address }] }),
    boundedCount(TokenTransfer, { $or: [{ from: address }, { to: address }] }),
    boundedCount(Withdrawal, { address }),
    boundedCount(Block, { miner: address }),
  ]);
  const implementation = proxy?.implementation ? await getVerifiedContract(proxy.implementation) : null;
  const creatorMeta = record?.creator ? await addressMeta([record.creator]) : {};

  return {
    address,
    balance: balance?.toString() ?? record?.balance ?? null,
    balanceUsd: balance !== null && price ? (Number(balance) / 1e18) * price.usd : null,
    nonce,
    isContract,
    delegation,
    codeSize: code && code !== '0x' ? (code.length - 2) / 2 : 0,
    label: getLabel(address, cid),
    record,
    creatorMeta: record?.creator ? creatorMeta[record.creator] ?? null : null,
    counts: { transactions: txCount, internal: internalCount, tokenTransfers: transferCount, withdrawals: withdrawalCount, minedBlocks: minedCount },
    firstTx,
    lastTx,
    token,
    verified: verified ? { name: verified.name, compilerVersion: verified.compilerVersion, matchType: verified.matchType } : null,
    proxy: proxy ? { ...proxy, implementationVerified: Boolean(implementation), implementationName: implementation?.name ?? null } : null,
    holdings,
    price,
  };
}

export async function getAddressLogs(address, { page = 1, limit = 25 } = {}) {
  const [rows, total, contract] = await Promise.all([
    Log.find({ address }).sort({ blockNumber: -1, logIndex: -1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean(),
    boundedCount(Log, { address }),
    getVerifiedContract(address),
  ]);
  const decoded = await Promise.all(rows.map((l) => decodeLog(l, { abi: contract?.abi })));
  return { logs: rows.map((l, i) => ({ ...l, decoded: decoded[i] })), pagination: paginate(total, page, limit) };
}

export async function getTopAccounts({ page = 1, limit = 25 } = {}) {
  const [rows, total] = await Promise.all([
    Address.find({ balanceNum: { $gt: 0 } }).sort({ balanceNum: -1 }).skip((page - 1) * limit).limit(limit).select({ ...NO_ID, address: 1, balance: 1, balanceNum: 1, isContract: 1, lastSeenBlock: 1 }).lean(),
    boundedCount(Address, { balanceNum: { $gt: 0 } }),
  ]);
  const meta = await addressMeta(rows.map((r) => r.address));
  const totalBalance = await cached('trackedBalance', 60_000, async () => (await Address.aggregate([{ $match: { balanceNum: { $gt: 0 } } }, { $group: { _id: null, s: { $sum: '$balanceNum' } } }]))[0]?.s ?? 0);
  return {
    accounts: rows.map((r, i) => ({ rank: (page - 1) * limit + i + 1, ...r, share: totalBalance ? (r.balanceNum / totalBalance) * 100 : 0, meta: meta[r.address] ?? null })),
    pagination: paginate(total, page, limit),
    trackedBalance: totalBalance,
  };
}

/** Rows for CSV export (max 5,000, like Etherscan's download limit). */
export async function exportAddressRows(address, kind = 'transactions') {
  const or = { $or: [{ from: address }, { to: address }] };
  if (kind === 'internal') return InternalTx.find(or).sort({ blockNumber: -1 }).limit(5000).select(NO_ID).lean();
  if (kind === 'tokens') return TokenTransfer.find(or).sort({ blockNumber: -1 }).limit(5000).select(NO_ID).lean();
  return Transaction.find({ $or: [...or.$or, { contractAddress: address }] })
    .sort({ blockNumber: -1, transactionIndex: -1 })
    .limit(5000)
    .select({ ...NO_ID, hash: 1, blockNumber: 1, timestamp: 1, from: 1, to: 1, contractAddress: 1, value: 1, fee: 1, gasUsed: 1, effectiveGasPrice: 1, status: 1, methodId: 1 })
    .lean();
}
