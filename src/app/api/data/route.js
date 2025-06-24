import dbConnect, { Block, Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    // Fetch latest 10 blocks sorted by number descending
    const blocks = await Block.find({}).sort({ number: -1 }).limit(10).lean();
    
    // Fetch latest 10 transactions sorted by block number descending
    const transactions = await Transaction.find({}).sort({ blockNumber: -1 }).limit(10).lean();

    return NextResponse.json({ blocks, transactions });

  } catch (error) {
    console.error('Data API error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
} 