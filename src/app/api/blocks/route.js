import dbConnect, { Block } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    const sort = searchParams.get('sort') || 'desc'; // 'asc' or 'desc'

    const sortOrder = sort === 'asc' ? 1 : -1;

    const blocks = await Block.find({})
      .sort({ number: sortOrder })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Block.countDocuments();

    return NextResponse.json({
      blocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Blocks API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
