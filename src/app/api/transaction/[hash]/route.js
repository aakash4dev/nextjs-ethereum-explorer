import dbConnect, { Transaction, Block } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { hash } = params;

    if (!hash || !hash.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid transaction hash' }, { status: 400 });
    }

    const transaction = await Transaction.findOne({ hash }).lean();
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get block details
    const block = await Block.findOne({ number: transaction.blockNumber }).lean();

    // Get previous and next transactions in the same block
    const prevTx = await Transaction.findOne({
      blockNumber: transaction.blockNumber,
      transactionIndex: { $lt: transaction.transactionIndex },
    })
      .sort({ transactionIndex: -1 })
      .select('hash')
      .lean();

    const nextTx = await Transaction.findOne({
      blockNumber: transaction.blockNumber,
      transactionIndex: { $gt: transaction.transactionIndex },
    })
      .sort({ transactionIndex: 1 })
      .select('hash')
      .lean();

    return NextResponse.json({
      transaction,
      block,
      navigation: {
        previous: prevTx?.hash || null,
        next: nextTx?.hash || null,
      },
    });
  } catch (error) {
    console.error('Transaction API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
