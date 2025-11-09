import dbConnect, { Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    const address = searchParams.get('address');
    const blockNumber = searchParams.get('blockNumber');

    const query = {};
    if (address) {
      query.$or = [
        { from: address.toLowerCase() },
        { to: address.toLowerCase() },
      ];
    }
    if (blockNumber) {
      query.blockNumber = parseInt(blockNumber, 10);
    }

    const transactions = await Transaction.find(query)
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Transaction.countDocuments(query);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
