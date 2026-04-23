import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Portfolio, Asset } from '@/lib/models';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;
}

interface PortfolioDoc {
  _id: unknown;
  userId: string;
  assets: PortfolioHolding[];
  cash: number;
  totalValue: number;
  updatedAt?: Date;
}

interface AssetDoc {
  symbol: string;
  currentPrice: number;
}

export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    const userId = DEFAULT_USER_ID;

    let portfolio = await Portfolio.findOne({ userId }).lean() as PortfolioDoc | null;

    if (!portfolio) {
      const newPortfolio = new Portfolio({
        userId,
        assets: [],
        cash: 100000,
        totalValue: 100000,
      });
      await newPortfolio.save();
      portfolio = newPortfolio.toObject() as PortfolioDoc;
    }

    // Enrich holdings with live currentPrice
    if (portfolio.assets && portfolio.assets.length > 0) {
      const marketAssets = await Asset.find({
        symbol: { $in: portfolio.assets.map((a: PortfolioHolding) => a.symbol) },
      }).lean() as AssetDoc[];

      const assetMap = new Map(marketAssets.map((a: AssetDoc) => [a.symbol, a.currentPrice]));

      const enrichedAssets: PortfolioHolding[] = portfolio.assets.map((pa: PortfolioHolding) => ({
        ...pa,
        currentPrice: assetMap.get(pa.symbol) ?? pa.averagePrice,
      }));

      const totalHoldingsValue = enrichedAssets.reduce(
        (sum: number, asset: PortfolioHolding) =>
          sum + asset.quantity * (asset.currentPrice ?? 0),
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
