import dbConnect, { Block, Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await dbConnect();
    const blockResult = await Block.deleteMany({});
    const txResult = await Transaction.deleteMany({});
    return NextResponse.json({ message: `Deleted ${blockResult.deletedCount} blocks and ${txResult.deletedCount} transactions.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 