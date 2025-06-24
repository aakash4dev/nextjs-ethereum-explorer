import dbConnect from '../../../lib/mongodb';
import { Block, Transaction } from '../../../lib/mongodb';

export async function GET(req) {
  await dbConnect();
  // Fetch latest 100 blocks
  const blocks = await Block.find({}).sort({ number: -1 }).limit(100).lean();
  // Optionally, you can also fetch transactions for each block if needed
  return new Response(JSON.stringify({ blocks }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 