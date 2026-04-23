import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Portfolio, Transaction, Asset } from '@/lib/models';
import { getUserId } from '@/lib/getUserId';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = getUserId(request);
    const body = await request.json();
    const { symbol, type, quantity, price } = body;

    // Validate input
    if (!symbol || !type || !quantity || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['BUY', 'SELL'].includes(type)) {
      return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 });
    }

    // Get portfolio
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const total = quantity * price;

    if (type === 'BUY') {
      // Reject if insufficient funds
      if (portfolio.cash < total) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
      }

      portfolio.cash -= total;

      const existingAsset = portfolio.assets.find((a: { symbol: string }) => a.symbol === symbol);

      if (existingAsset) {
        const newTotalCost = existingAsset.totalCost + total;
        const newQuantity = existingAsset.quantity + quantity;
        existingAsset.averagePrice = newTotalCost / newQuantity;
        existingAsset.totalCost = newTotalCost;
        existingAsset.quantity = newQuantity;
      } else {
        portfolio.assets.push({
          symbol,
          quantity,
          averagePrice: price,
          totalCost: total,
        });
      }
    } else if (type === 'SELL') {
      const assetIndex = portfolio.assets.findIndex((a: { symbol: string }) => a.symbol === symbol);

      if (assetIndex === -1) {
        return NextResponse.json({ error: 'Asset not found in portfolio' }, { status: 400 });
      }

      const asset = portfolio.assets[assetIndex];

      if (asset.quantity < quantity) {
        return NextResponse.json({ error: 'Insufficient quantity to sell' }, { status: 400 });
      }

      asset.quantity -= quantity;
      portfolio.cash += total;

      if (asset.quantity === 0) {
        portfolio.assets.splice(assetIndex, 1);
      }
    }

    // Fix: recalculate totalValue using live currentPrice from Asset collection,
    // not averagePrice (which was the bug).
    const holdingSymbols = portfolio.assets.map((a: { symbol: string }) => a.symbol);
    const marketAssets = await Asset.find({ symbol: { $in: holdingSymbols } }).lean() as Array<{ symbol: string; currentPrice: number }>;
    const priceMap = new Map(marketAssets.map((a) => [a.symbol, a.currentPrice]));

    const totalHoldingsValue = portfolio.assets.reduce(
      (sum: number, asset: { symbol: string; quantity: number; averagePrice: number }) => {
        const currentPrice = priceMap.get(asset.symbol) ?? asset.averagePrice;
        return sum + asset.quantity * currentPrice;
      },
      0
    );

    portfolio.totalValue = portfolio.cash + totalHoldingsValue;
    portfolio.updatedAt = new Date();

    await portfolio.save();

    // Create transaction record — total is always quantity * price
    const transaction = new Transaction({
      userId,
      symbol,
      type,
      quantity,
      price,
      total,
      timestamp: new Date(),
    });

    await transaction.save();

    return NextResponse.json(
      {
        success: true,
        portfolio: portfolio.toObject(),
        transaction: transaction.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing trade:', error);
    return NextResponse.json({ error: 'Failed to process trade' }, { status: 500 });
  }
}
