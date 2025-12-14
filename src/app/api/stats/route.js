import dbConnect, { Block, Transaction, Address, IndexerState } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    const [
      totalBlocks,
      totalTransactions,
      totalAddresses,
      latestBlock,
      indexerState,
      blocksLast24h,
      transactionsLast24h,
      marketData,
    ] = await Promise.all([
      Block.countDocuments(),
      Transaction.countDocuments(),
      Address.countDocuments(),
      Block.findOne().sort({ number: -1 }).select('number timestamp').lean(),
      IndexerState.findOne({ key: 'sync_state' }).lean(),
      Block.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Transaction.countDocuments({
        indexedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_change=true")
        .then(res => res.json())
        .catch(err => {
          console.error("Failed to fetch price:", err);
          return null;
        }),
    ]);

    // Calculate gas statistics
    const gasStats = await Block.aggregate([
      {
        $group: {
          _id: null,
          avgGasUsed: { $avg: { $toDouble: '$gasUsed' } },
          avgGasLimit: { $avg: { $toDouble: '$gasLimit' } },
          totalGasUsed: { $sum: { $toDouble: '$gasUsed' } },
        },
      },
    ]);

    return NextResponse.json({
      overview: {
        totalBlocks,
        totalTransactions,
        totalAddresses,
        latestBlockNumber: latestBlock?.number || 0,
        latestBlockTime: latestBlock?.timestamp || null,
      },
      indexer: indexerState || {
        lastProcessedBlock: 0,
        isSyncing: false,
        totalBlocksIndexed: 0,
        totalTransactionsIndexed: 0,
      },
      activity: {
        blocksLast24h,
        transactionsLast24h,
      },
      gas: gasStats[0] || {
        avgGasUsed: 0,
        avgGasLimit: 0,
        totalGasUsed: 0,
      },
      market: marketData?.ethereum || {
        usd: 0,
        usd_market_cap: 0,
        usd_24h_change: 0,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

