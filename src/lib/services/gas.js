/**
 * Gas oracle (eth_feeHistory percentiles), cost estimates for common actions,
 * and gas guzzlers / spenders computed from indexed transactions.
 */
import { rpc } from '../rpc.js';
import { Transaction } from '../models.js';
import { weiToNumber } from '../format.js';
import { addressMeta, cached } from './common.js';
import { getNativePrice } from './market.js';

const BLOCKS = 20;
const PERCENTILES = [10, 50, 90];

const median = (arr) => {
  const s = [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return s.length ? s[Math.floor(s.length / 2)] : 0n;
};

export const GAS_ACTIONS = [
  { action: 'ETH Transfer', gas: 21_000 },
  { action: 'ERC-20 Transfer', gas: 65_000 },
  { action: 'ERC-20 Approve', gas: 46_000 },
  { action: 'NFT Transfer', gas: 85_000 },
  { action: 'NFT Sale (Seaport)', gas: 200_000 },
  { action: 'Swap (Uniswap V3)', gas: 185_000 },
  { action: 'Swap (Uniswap V2)', gas: 152_000 },
  { action: 'Add Liquidity', gas: 200_000 },
  { action: 'Bridge Deposit', gas: 120_000 },
  { action: 'Lending Borrow', gas: 300_000 },
  { action: 'Safe Multisig Exec', gas: 110_000 },
  { action: 'ENS Registration', gas: 270_000 },
];

export async function getGasOracle() {
  return cached('gasOracle', 6000, async () => {
    const latest = await rpc('eth_getBlockByNumber', ['latest', false]);
    const lastBlock = Number(BigInt(latest.number));
    if (latest.baseFeePerGas === undefined || latest.baseFeePerGas === null) {
      const gp = BigInt(await rpc('eth_gasPrice'));
      const tier = { maxFee: gp.toString(), priorityFee: '0', gasPrice: gp.toString(), waitSeconds: null };
      return { lastBlock, eip1559: false, baseFee: null, nextBaseFee: null, slow: tier, standard: tier, fast: tier, history: [] };
    }
    const fh = await rpc('eth_feeHistory', [`0x${BLOCKS.toString(16)}`, 'latest', PERCENTILES]);
    const rewards = (fh.reward ?? []).map((r) => r.map((x) => BigInt(x)));
    const baseFees = (fh.baseFeePerGas ?? []).map((x) => BigInt(x));
    const nextBaseFee = baseFees[baseFees.length - 1] ?? BigInt(latest.baseFeePerGas);
    const oldest = Number(BigInt(fh.oldestBlock));
    const tier = (i, waitSeconds) => {
      const prio = median(rewards.map((r) => r[i] ?? 0n));
      // Allow headroom for base fee growth over the next couple of blocks.
      const maxFee = nextBaseFee * 2n + prio;
      return { priorityFee: prio.toString(), gasPrice: (nextBaseFee + prio).toString(), maxFee: maxFee.toString(), waitSeconds };
    };
    const history = baseFees.slice(0, -1).map((b, i) => ({
      block: oldest + i,
      baseFee: b.toString(),
      gasUsedRatio: fh.gasUsedRatio?.[i] ?? null,
      priorityFee: rewards[i]?.[1]?.toString() ?? '0',
    }));
    return {
      lastBlock,
      eip1559: true,
      baseFee: BigInt(latest.baseFeePerGas).toString(),
      nextBaseFee: nextBaseFee.toString(),
      slow: tier(0, 60),
      standard: tier(1, 24),
      fast: tier(2, 12),
      history,
      blobBaseFee: fh.baseFeePerBlobGas?.length ? BigInt(fh.baseFeePerBlobGas[fh.baseFeePerBlobGas.length - 1]).toString() : null,
    };
  });
}

export async function getGasEstimates(oracle) {
  const price = await getNativePrice();
  return GAS_ACTIONS.map(({ action, gas }) => {
    const row = { action, gas };
    for (const t of ['slow', 'standard', 'fast']) {
      const eth = weiToNumber(BigInt(oracle[t].gasPrice) * BigInt(gas));
      row[t] = { eth, usd: price ? eth * price.usd : null };
    }
    return row;
  });
}

async function topBy(field, blockWindow) {
  const latest = await Transaction.findOne().sort({ blockNumber: -1 }).select({ blockNumber: 1 }).lean();
  if (!latest) return [];
  const rows = await Transaction.aggregate([
    { $match: { blockNumber: { $gt: latest.blockNumber - blockWindow }, [field]: { $ne: null } } },
    { $group: { _id: `$${field}`, gasUsed: { $sum: '$gasUsed' }, fees: { $sum: { $toDouble: '$fee' } }, txs: { $sum: 1 } } },
    { $sort: { gasUsed: -1 } },
    { $limit: 15 },
  ]).option({ maxTimeMS: 10_000 });
  const total = rows.reduce((s, r) => s + r.gasUsed, 0) || 1;
  const meta = await addressMeta(rows.map((r) => r._id));
  return rows.map((r) => ({
    address: r._id,
    gasUsed: r.gasUsed,
    share: (r.gasUsed / total) * 100,
    feesEth: r.fees / 1e18,
    txs: r.txs,
    ...meta[r._id],
  }));
}

/** Contracts consuming the most gas over the last `blockWindow` indexed blocks. */
export async function getGasGuzzlers(blockWindow = 300) {
  return cached(`guzzlers:${blockWindow}`, 30_000, () => topBy('to', blockWindow));
}

/** Accounts spending the most gas over the last `blockWindow` indexed blocks. */
export async function getGasSpenders(blockWindow = 300) {
  return cached(`spenders:${blockWindow}`, 30_000, () => topBy('from', blockWindow));
}
