import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Asset } from '@/lib/models';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const MOCK_ASSETS = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPrice: 45230.50,
    change24h: 1250.50,
    changePercent24h: 2.84,
    highPrice: 46000,
    lowPrice: 44500,
    volume24h: 28500000000,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    currentPrice: 2450.75,
    change24h: 95.25,
    changePercent24h: 4.05,
    highPrice: 2500,
    lowPrice: 2380,
    volume24h: 15200000000,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 195.75,
    change24h: 2.50,
    changePercent24h: 1.30,
    highPrice: 197.5,
    lowPrice: 193.2,
    volume24h: 52500000,
  },
  {
    symbol: 'GOOGL',
    name: 'Google LLC',
    currentPrice: 142.30,
    change24h: -1.25,
    changePercent24h: -0.87,
    highPrice: 145.0,
    lowPrice: 140.5,
    volume24h: 21300000,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    currentPrice: 420.50,
    change24h: 5.75,
    changePercent24h: 1.40,
    highPrice: 425.0,
    lowPrice: 415.25,
    volume24h: 18900000,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    currentPrice: 235.80,
    change24h: -3.50,
    changePercent24h: -1.46,
    highPrice: 240.0,
    lowPrice: 232.5,
    volume24h: 95500000,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    currentPrice: 187.45,
    change24h: 4.25,
    changePercent24h: 2.32,
    highPrice: 190.0,
    lowPrice: 185.5,
    volume24h: 42300000,
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    currentPrice: 245.60,
    change24h: 8.50,
    changePercent24h: 3.58,
    highPrice: 248.5,
    lowPrice: 238.0,
    volume24h: 28900000,
  },
];

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    let assets = await Asset.find({}).lean() as Array<Record<string, unknown>>;

    if (assets.length === 0) {
      await Asset.insertMany(MOCK_ASSETS);
      assets = await Asset.find({}).lean() as Array<Record<string, unknown>>;
    }

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    await connectDB();
    const body = await _request.json();

    const asset = new Asset(body);
    await asset.save();

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
