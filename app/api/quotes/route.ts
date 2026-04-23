import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Asset } from '@/lib/models';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes
 *
 * Fetches current quotes from Finnhub REST API for all tracked symbols
 * and upserts them into MongoDB. Called once on app startup to seed
 * real prices before the WebSocket stream takes over.
 *
 * Falls back gracefully if FINNHUB_API_KEY is not set.
 */

const TRACKED_SYMBOLS = [
  { symbol: 'BTC',   finnhub: 'BINANCE:BTCUSDT', name: 'Bitcoin',         isCrypto: true  },
  { symbol: 'ETH',   finnhub: 'BINANCE:ETHUSDT',  name: 'Ethereum',        isCrypto: true  },
  { symbol: 'AAPL',  finnhub: 'AAPL',             name: 'Apple Inc.',      isCrypto: false },
  { symbol: 'GOOGL', finnhub: 'GOOGL',            name: 'Google LLC',      isCrypto: false },
  { symbol: 'MSFT',  finnhub: 'MSFT',             name: 'Microsoft',       isCrypto: false },
  { symbol: 'TSLA',  finnhub: 'TSLA',             name: 'Tesla Inc.',      isCrypto: false },
  { symbol: 'AMZN',  finnhub: 'AMZN',             name: 'Amazon.com Inc.', isCrypto: false },
  { symbol: 'NFLX',  finnhub: 'NFLX',             name: 'Netflix Inc.',    isCrypto: false },
];

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
}

async function fetchQuote(finnhubSymbol: string, apiKey: string): Promise<FinnhubQuote | null> {
  try {
    // Crypto uses a different endpoint
    const isCrypto = finnhubSymbol.includes(':');
    const url = isCrypto
      ? `https://finnhub.io/api/v1/crypto/candle?symbol=${finnhubSymbol}&resolution=D&count=2&token=${apiKey}`
      : `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const data = await res.json();

    if (isCrypto) {
      // Crypto candle response: { c: [...], h: [...], l: [...], o: [...] }
      if (!data.c || data.c.length === 0) return null;
      const current = data.c[data.c.length - 1];
      const prev    = data.c[data.c.length - 2] ?? current;
      return {
        c:  current,
        d:  current - prev,
        dp: ((current - prev) / prev) * 100,
        h:  Math.max(...data.h),
        l:  Math.min(...data.l),
        o:  data.o[0],
        pc: prev,
      };
    }

    return data as FinnhubQuote;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 503 });
  }

  try {
    await connectDB();

    const results = await Promise.allSettled(
      TRACKED_SYMBOLS.map(async ({ symbol, finnhub, name }) => {
        const quote = await fetchQuote(finnhub, apiKey);
        if (!quote || !quote.c || quote.c <= 0) return null;

        // Upsert into MongoDB with real prices
        await Asset.findOneAndUpdate(
          { symbol },
          {
            symbol,
            name,
            currentPrice:     quote.c,
            change24h:        quote.d  ?? 0,
            changePercent24h: quote.dp ?? 0,
            highPrice:        quote.h  ?? quote.c,
            lowPrice:         quote.l  ?? quote.c,
            volume24h:        0, // Finnhub free tier doesn't include volume in quote
          },
          { upsert: true, new: true }
        );

        return { symbol, price: quote.c };
      })
    );

    const updated = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<{ symbol: string; price: number } | null>).value);

    return NextResponse.json({ updated, count: updated.length });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
