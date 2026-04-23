import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Watchlist, Asset } from '@/lib/models';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;

    let watchlist = await Watchlist.findOne({ userId }).lean();

    if (!watchlist) {
      const newWatchlist = new Watchlist({
        userId,
        symbols: ['BTC', 'ETH', 'AAPL'],
      });
      await newWatchlist.save();
      watchlist = newWatchlist.toObject();
    }

    // Enrich with asset data
    if (watchlist.symbols && watchlist.symbols.length > 0) {
      const assets = await Asset.find({ symbol: { $in: watchlist.symbols } }).lean();
      return NextResponse.json({ ...watchlist, assets });
    }

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    let watchlist = await Watchlist.findOne({ userId });

    if (!watchlist) {
      watchlist = new Watchlist({ userId, symbols: [symbol] });
    } else if (!watchlist.symbols.includes(symbol)) {
      watchlist.symbols.push(symbol);
    }

    await watchlist.save();

    return NextResponse.json(watchlist.toObject());
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const watchlist = await Watchlist.findOne({ userId });

    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    watchlist.symbols = watchlist.symbols.filter((s) => s !== symbol);
    await watchlist.save();

    return NextResponse.json(watchlist.toObject());
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
