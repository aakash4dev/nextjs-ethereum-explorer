import dbConnect, { Block, Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    // Fetch latest blocks with pagination
    const blocks = await Block.find({})
      .sort({ number: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Fetch latest transactions with pagination
    const transactions = await Transaction.find({})
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total counts
    const totalBlocks = await Block.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    return NextResponse.json({
      blocks,
      transactions,
      pagination: {
        page,
        limit,
        totalBlocks,
        totalTransactions,
        totalPagesBlocks: Math.ceil(totalBlocks / limit),
        totalPagesTransactions: Math.ceil(totalTransactions / limit),
      },
    });
  } catch (error) {
    console.error('Data API error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
