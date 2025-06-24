import { runIndexer } from '../../../lib/indexer';

export async function POST() {
  try {
    const result = await runIndexer();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export function GET() {
  return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
} 