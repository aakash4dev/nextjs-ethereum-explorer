import dbConnect, { Transaction } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();
  const { hash } = params;
  const transaction = await Transaction.findOne({ hash }).lean();
  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }
  return NextResponse.json({ transaction });
} 