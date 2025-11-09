import dbConnect, { Block, Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { number } = params;
    const blockNumber = parseInt(number, 10);

    if (isNaN(blockNumber)) {
      return NextResponse.json({ error: 'Invalid block number' }, { status: 400 });
    }

    const block = await Block.findOne({ number: blockNumber }).lean();
    
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Get transactions for this block
    const transactions = await Transaction.find({ blockNumber })
      .sort({ transactionIndex: 1 })
      .lean();

    // Get previous and next block numbers
    const prevBlock = await Block.findOne({ number: { $lt: blockNumber } })
      .sort({ number: -1 })
      .select('number')
      .lean();
    
    const nextBlock = await Block.findOne({ number: { $gt: blockNumber } })
      .sort({ number: 1 })
      .select('number')
      .lean();

    return NextResponse.json({
      block,
      transactions,
      navigation: {
        previous: prevBlock?.number || null,
        next: nextBlock?.number || null,
      },
    });
  } catch (error) {
    console.error('Block API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
