import dbConnect from '../../../lib/mongodb';
import { Transaction } from '../../../lib/mongodb';

export async function GET(req) {
  await dbConnect();
  // Fetch latest 100 transactions
  const transactions = await Transaction.find({}).sort({ blockNumber: -1 }).limit(100).lean();
  return new Response(JSON.stringify({ transactions }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 