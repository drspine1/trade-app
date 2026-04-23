import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;

    const transactions = await Transaction.find({ userId }).sort({ timestamp: -1 }).lean();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
