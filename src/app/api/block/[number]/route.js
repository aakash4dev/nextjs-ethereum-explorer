import dbConnect, { Block, Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();
  const { number } = params;
  const block = await Block.findOne({ number: Number(number) }).lean();
  if (!block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }
  const transactions = await Transaction.find({ blockNumber: Number(number) }).lean();
  return NextResponse.json({ block, transactions });
} 