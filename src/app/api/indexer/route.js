import { runIndexer, getSyncStatus } from '../../../lib/indexer';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await runIndexer();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Indexer API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Sync status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
