/**
 * Daily aggregate statistics powering the charts pages. Each UTC day is
 * recomputed from source collections (idempotent), so reorgs and late blocks
 * self-heal on the next run.
 */
import { Block, DailyStat, TokenTransfer, Transaction } from '../models.js';
import { createLogger } from '../logger.js';

const log = createLogger('stats');
const DAY = 86_400_000;

export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

export async function computeDay(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + DAY);
  const range = { $gte: start, $lt: end };

  const [blocks] = await Block.aggregate([
    { $match: { timestamp: range } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        gasUsed: { $sum: '$gasUsed' },
        avgGasLimit: { $avg: '$gasLimit' },
        avgSize: { $avg: '$size' },
        burnt: { $sum: { $toDouble: '$burntFees' } },
        avgBaseFee: { $avg: { $toDouble: '$baseFeePerGas' } },
        minTs: { $min: '$timestamp' },
        maxTs: { $max: '$timestamp' },
        minN: { $min: '$number' },
        maxN: { $max: '$number' },
      },
    },
  ]);

  if (!blocks) {
    await DailyStat.deleteOne({ date });
    return null;
  }

  const [txs] = await Transaction.aggregate([
    { $match: { timestamp: range } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        failed: { $sum: { $cond: [{ $eq: ['$status', 0] }, 1, 0] } },
        avgGasPrice: { $avg: { $toDouble: '$effectiveGasPrice' } },
        fees: { $sum: { $toDouble: '$fee' } },
        contracts: { $sum: { $cond: [{ $ifNull: ['$contractAddress', false] }, 1, 0] } },
      },
    },
  ]);

  const [active] = await Transaction.aggregate([
    { $match: { timestamp: range } },
    { $project: { a: ['$from', '$to'] } },
    { $unwind: '$a' },
    { $match: { a: { $ne: null } } },
    { $group: { _id: '$a' } },
    { $count: 'n' },
  ]).allowDiskUse(true);

  const tokenTransfers = await TokenTransfer.countDocuments({ timestamp: range });

  const span = (blocks.maxTs - blocks.minTs) / 1000;
  const doc = {
    date,
    blockCount: blocks.count,
    txCount: txs?.count ?? 0,
    failedTxCount: txs?.failed ?? 0,
    gasUsed: blocks.gasUsed,
    avgGasLimit: Math.round(blocks.avgGasLimit ?? 0),
    avgGasPrice: txs?.avgGasPrice ?? 0,
    avgBlockTime: blocks.maxN > blocks.minN ? span / (blocks.maxN - blocks.minN) : null,
    avgBlockSize: Math.round(blocks.avgSize ?? 0),
    totalFees: (txs?.fees ?? 0) / 1e18,
    burntFees: (blocks.burnt ?? 0) / 1e18,
    activeAddresses: active?.n ?? 0,
    contractsDeployed: txs?.contracts ?? 0,
    tokenTransfers,
    avgBaseFee: blocks.avgBaseFee ?? 0,
    updatedAt: new Date(),
  };
  await DailyStat.updateOne({ date }, { $set: doc }, { upsert: true });
  return doc;
}

/**
 * Recompute today and yesterday, and backfill any indexed day that has no
 * stats row yet (first run, or after a long outage).
 */
export async function refreshDailyStats() {
  const [first, last] = await Promise.all([
    Block.findOne().sort({ number: 1 }).select({ timestamp: 1 }).lean(),
    Block.findOne().sort({ number: -1 }).select({ timestamp: 1 }).lean(),
  ]);
  if (!first || !last) return 0;

  const wanted = new Set([dayKey(last.timestamp), dayKey(last.timestamp.getTime() - DAY)]);
  const existing = new Set((await DailyStat.find().select({ date: 1 }).lean()).map((d) => d.date));
  for (let t = new Date(dayKey(first.timestamp)).getTime(); t <= last.timestamp.getTime(); t += DAY) {
    const k = dayKey(t);
    if (!existing.has(k)) wanted.add(k);
  }
  let n = 0;
  for (const date of [...wanted].sort()) {
    if (date < dayKey(first.timestamp)) continue;
    try {
      await computeDay(date);
      n += 1;
    } catch (err) {
      log.warn('daily stats failed', { date, err });
    }
  }
  return n;
}
