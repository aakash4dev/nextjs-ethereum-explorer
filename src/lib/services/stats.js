import { Address, Block, Contract, DailyStat, Token, Transaction } from '../models.js';
import { NO_ID, cached, safeHead } from './common.js';
import { getNativePrice } from './market.js';
import { getGasOracle } from './gas.js';

/** Headline numbers for the home page and /api/stats. */
export async function getNetworkStats() {
  return cached('networkStats', 4000, async () => {
    const [txTotal, blockTotal, addressTotal, contractsVerified, tokens, recent, head, price, gas, history] = await Promise.all([
      Transaction.estimatedDocumentCount(),
      Block.estimatedDocumentCount(),
      Address.estimatedDocumentCount(),
      Contract.estimatedDocumentCount(),
      Token.estimatedDocumentCount(),
      Block.find().sort({ number: -1 }).limit(100).select({ ...NO_ID, number: 1, timestamp: 1, transactionCount: 1, gasUsed: 1, gasLimit: 1 }).lean(),
      safeHead(),
      getNativePrice(),
      getGasOracle().catch(() => null),
      DailyStat.find().sort({ date: -1 }).limit(14).select({ ...NO_ID, date: 1, txCount: 1 }).lean(),
    ]);
    let tps = null;
    let avgBlockTime = null;
    if (recent.length > 1) {
      const span = (recent[0].timestamp - recent[recent.length - 1].timestamp) / 1000;
      const txs = recent.slice(0, -1).reduce((s, b) => s + b.transactionCount, 0);
      if (span > 0) {
        tps = txs / span;
        avgBlockTime = span / (recent[0].number - recent[recent.length - 1].number);
      }
    }
    const latest = recent[0] ?? null;
    return {
      totals: { transactions: txTotal, blocks: blockTotal, addresses: addressTotal, verifiedContracts: contractsVerified, tokens },
      latestIndexedBlock: latest?.number ?? null,
      latestIndexedTime: latest?.timestamp ?? null,
      headBlock: head,
      tps,
      avgBlockTime,
      price,
      gas: gas ? { standard: gas.standard.gasPrice, baseFee: gas.baseFee, slow: gas.slow.gasPrice, fast: gas.fast.gasPrice } : null,
      txHistory: history.reverse(),
    };
  });
}

export const CHARTS = {
  tx: { title: 'Daily Transactions', field: 'txCount', unit: 'transactions', description: 'Number of transactions per day.' },
  blocks: { title: 'Blocks Per Day', field: 'blockCount', unit: 'blocks', description: 'Number of blocks produced per day.' },
  'block-time': { title: 'Average Block Time', field: 'avgBlockTime', unit: 'seconds', description: 'Average time between blocks.' },
  'block-size': { title: 'Average Block Size', field: 'avgBlockSize', unit: 'bytes', description: 'Average block size in bytes.' },
  'gas-used': { title: 'Daily Gas Used', field: 'gasUsed', unit: 'gas', description: 'Total gas consumed per day.' },
  'gas-limit': { title: 'Average Gas Limit', field: 'avgGasLimit', unit: 'gas', description: 'Average block gas limit.' },
  'gas-price': { title: 'Average Gas Price', field: 'avgGasPrice', unit: 'gwei', scale: 1e-9, description: 'Average effective gas price paid.' },
  'base-fee': { title: 'Average Base Fee', field: 'avgBaseFee', unit: 'gwei', scale: 1e-9, description: 'Average EIP-1559 base fee per gas.' },
  fees: { title: 'Daily Transaction Fees', field: 'totalFees', unit: 'native', description: 'Total fees paid by transactions.' },
  burnt: { title: 'Daily Fees Burnt', field: 'burntFees', unit: 'native', description: 'Fees burnt under EIP-1559 (and EIP-4844 blob fees).' },
  'active-addresses': { title: 'Active Addresses', field: 'activeAddresses', unit: 'addresses', description: 'Unique senders and receivers per day.' },
  contracts: { title: 'Contracts Deployed', field: 'contractsDeployed', unit: 'contracts', description: 'Contracts created by top-level transactions per day.' },
  'token-transfers': { title: 'Token Transfers', field: 'tokenTransfers', unit: 'transfers', description: 'ERC-20, ERC-721 and ERC-1155 transfers per day.' },
  'failed-tx': { title: 'Failed Transactions', field: 'failedTxCount', unit: 'transactions', description: 'Transactions that reverted per day.' },
};

export async function getChartSeries(metric, days = 365) {
  const def = CHARTS[metric];
  if (!def) return null;
  const rows = await DailyStat.find().sort({ date: -1 }).limit(days).select({ ...NO_ID, date: 1, [def.field]: 1 }).lean();
  return {
    metric,
    ...def,
    points: rows.reverse().map((r) => ({ date: r.date, value: (r[def.field] ?? 0) * (def.scale ?? 1) })),
  };
}

export async function getAllDailyStats(days = 30) {
  return DailyStat.find().sort({ date: -1 }).limit(days).select(NO_ID).lean();
}
