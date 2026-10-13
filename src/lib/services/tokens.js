import { NftInstance, Token, TokenBalance, TokenTransfer } from '../models.js';
import { getClient } from '../rpc.js';
import { ERC1155_ABI, ERC721_ABI } from '../abi.js';
import { NO_ID, addressMeta, boundedCount, paginate } from './common.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TOKEN_FIELDS = { ...NO_ID, address: 1, type: 1, name: 1, symbol: 1, decimals: 1, totalSupply: 1, holdersCount: 1, firstSeenBlock: 1, lastTransferBlock: 1 };

export async function listTokens({ type = 'ERC20', page = 1, limit = 25, sort = 'holders', q } = {}) {
  const types = type === 'NFT' ? ['ERC721', 'ERC1155'] : [type];
  const filter = { type: { $in: types } };
  if (q) {
    const re = { $regex: escapeRe(q), $options: 'i' };
    filter.$or = [{ name: re }, { symbol: re }];
  }
  const order = sort === 'recent' ? { lastTransferBlock: -1 } : sort === 'name' ? { name: 1 } : { holdersCount: -1, lastTransferBlock: -1 };
  const [tokens, total] = await Promise.all([
    Token.find(filter).sort(order).skip((page - 1) * limit).limit(limit).select(TOKEN_FIELDS).lean(),
    Token.countDocuments(filter),
  ]);
  return { tokens, pagination: paginate(total, page, limit) };
}

export async function getToken(address) {
  const token = await Token.findOne({ address }).select(TOKEN_FIELDS).lean();
  if (!token) return null;
  const transfers = await boundedCount(TokenTransfer, { token: address });
  return { ...token, transfersCount: transfers };
}

export async function listTokenTransfers({ page = 1, limit = 25, token, address, type, tokenId } = {}) {
  const filter = {};
  if (token) filter.token = token;
  if (tokenId !== undefined && tokenId !== null) filter.tokenId = String(tokenId);
  if (type) filter.tokenType = type === 'NFT' ? { $in: ['ERC721', 'ERC1155'] } : type;
  if (address) filter.$or = [{ from: address }, { to: address }];
  const [rows, total] = await Promise.all([
    TokenTransfer.find(filter).sort({ blockNumber: -1, logIndex: -1, batchIndex: -1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean(),
    Object.keys(filter).length ? boundedCount(TokenTransfer, filter) : TokenTransfer.estimatedDocumentCount(),
  ]);
  const tokens = await Token.find({ address: { $in: [...new Set(rows.map((r) => r.token))] } }).select(TOKEN_FIELDS).lean();
  const byAddr = new Map(tokens.map((t) => [t.address, t]));
  const meta = await addressMeta(rows.flatMap((r) => [r.from, r.to]));
  return { transfers: rows.map((r) => ({ ...r, tokenInfo: byAddr.get(r.token) ?? null })), meta, pagination: paginate(total, page, limit) };
}

export async function getTokenHolders(token, { page = 1, limit = 25 } = {}) {
  const info = await Token.findOne({ address: token }).select(TOKEN_FIELDS).lean();
  if (!info) return null;
  if (info.type === 'ERC1155') {
    // Aggregate per-holder across token ids.
    const rows = await TokenBalance.aggregate([
      { $match: { token } },
      { $group: { _id: '$holder', ids: { $sum: 1 }, balanceNum: { $sum: '$balanceNum' } } },
      { $sort: { balanceNum: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    const meta = await addressMeta(rows.map((r) => r._id));
    return { token: info, holders: rows.map((r) => ({ holder: r._id, balance: String(r.balanceNum), distinctIds: r.ids, meta: meta[r._id] ?? null })), pagination: paginate(info.holdersCount, page, limit) };
  }
  const rows = await TokenBalance.find({ token }).sort({ balanceNum: -1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean();
  const supply = info.totalSupply ? BigInt(info.totalSupply) : 0n;
  const meta = await addressMeta(rows.map((r) => r.holder));
  return {
    token: info,
    holders: rows.map((r) => ({
      holder: r.holder,
      balance: r.balance,
      percentage: supply > 0n ? Number((BigInt(r.balance) * 1_000_000n) / supply) / 10_000 : null,
      meta: meta[r.holder] ?? null,
    })),
    pagination: paginate(info.holdersCount, page, limit),
  };
}

export async function getTokenInventory(token, { page = 1, limit = 24 } = {}) {
  const [rows, total] = await Promise.all([
    NftInstance.find({ token }).sort({ lastSeq: -1 }).skip((page - 1) * limit).limit(limit).select(NO_ID).lean(),
    boundedCount(NftInstance, { token }),
  ]);
  return { items: rows, pagination: paginate(total, page, limit) };
}

/** Token holdings of an address (indexed balances), with token metadata. */
export async function getAddressTokenHoldings(address, limit = 200) {
  const rows = await TokenBalance.find({ holder: address }).sort({ balanceNum: -1 }).limit(limit).select(NO_ID).lean();
  const tokens = await Token.find({ address: { $in: [...new Set(rows.map((r) => r.token))] } }).select(TOKEN_FIELDS).lean();
  const byAddr = new Map(tokens.map((t) => [t.address, t]));
  return rows.map((r) => ({ ...r, tokenInfo: byAddr.get(r.token) ?? null }));
}

export async function getNftMetadataUri(token, tokenId, type) {
  try {
    const client = getClient();
    if (type === 'ERC1155') return await client.readContract({ address: token, abi: ERC1155_ABI, functionName: 'uri', args: [BigInt(tokenId)] });
    return await client.readContract({ address: token, abi: ERC721_ABI, functionName: 'tokenURI', args: [BigInt(tokenId)] });
  } catch {
    return null;
  }
}
