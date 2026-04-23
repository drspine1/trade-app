import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Portfolio, Asset } from '@/lib/models';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;

    let portfolio = await Portfolio.findOne({ userId }).lean();

    if (!portfolio) {
      const newPortfolio = new Portfolio({
        userId,
        assets: [],
        cash: 100000,
        totalValue: 100000,
      });
      await newPortfolio.save();
      portfolio = newPortfolio.toObject();
    }

    // Enrich with current prices
    if (portfolio.assets && portfolio.assets.length > 0) {
      const assets = await Asset.find({
        symbol: { $in: portfolio.assets.map((a) => a.symbol) },
      }).lean();

      const assetMap = new Map(assets.map((a) => [a.symbol, a]));

      const enrichedAssets = portfolio.assets.map((pa) => ({
        ...pa,
        currentPrice: assetMap.get(pa.symbol)?.currentPrice || pa.averagePrice,
      }));

      const totalHoldingsValue = enrichedAssets.reduce(
        (sum, asset) => sum + (asset.quantity * (asset.currentPrice || 0)),
        0
      );

      portfolio.totalValue = totalHoldingsValue + portfolio.cash;
      portfolio.assets = enrichedAssets;
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
