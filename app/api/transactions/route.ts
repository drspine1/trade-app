import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { getUserId } from '@/lib/getUserId';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = getUserId(request);

    const transactions = await Transaction.find({ userId })
      .sort({ timestamp: -1 })
      .lean() as Array<Record<string, unknown>>;

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
