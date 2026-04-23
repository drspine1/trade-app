import { NextRequest } from 'next/server';

/**
 * GET /api/market-stream?symbols=BTC,ETH,AAPL,...
 *
 * Server-Sent Events proxy for Finnhub WebSocket.
 * Uses the native Node.js WebSocket (Node 18+) — no external package needed.
 * API key stays server-side and is never exposed to the browser.
 *
 * Finnhub symbol format:
 *   Crypto : BINANCE:BTCUSDT, BINANCE:ETHUSDT
 *   Stocks : AAPL, MSFT, TSLA, GOOGL, AMZN, NFLX
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// App symbol → Finnhub subscription symbol
const SYMBOL_MAP: Record<string, string> = {
  BTC:   'BINANCE:BTCUSDT',
  ETH:   'BINANCE:ETHUSDT',
  AAPL:  'AAPL',
  GOOGL: 'GOOGL',
  MSFT:  'MSFT',
  TSLA:  'TSLA',
  AMZN:  'AMZN',
  NFLX:  'NFLX',
};

// Finnhub symbol → app symbol
const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([app, fh]) => [fh, app])
);

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    return new Response('FINNHUB_API_KEY not configured', { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const requestedSymbols = symbolsParam.split(',').filter(Boolean);

  if (requestedSymbols.length === 0) {
    return new Response('No symbols requested', { status: 400 });
  }

  const finnhubSymbols = requestedSymbols
    .map((s) => SYMBOL_MAP[s.toUpperCase()])
    .filter(Boolean) as string[];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Native Node.js WebSocket — available in Node 18+ without any import
      const ws = new (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket(
        `wss://ws.finnhub.io?token=${apiKey}`
      );

      const openPrices: Record<string, number> = {};

      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller already closed */ }
      };

      ws.addEventListener('open', () => {
        finnhubSymbols.forEach((symbol) => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
        send({ type: 'connected' });
      });

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const msg = JSON.parse(
            typeof event.data === 'string' ? event.data : event.data.toString()
          );

          if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;

          // Finnhub batches trades — take the latest price per symbol
          const latest: Record<string, number> = {};
          for (const trade of msg.data) {
            latest[trade.s] = trade.p; // s = symbol, p = price
          }

          for (const [finnhubSymbol, price] of Object.entries(latest)) {
            const appSymbol = REVERSE_MAP[finnhubSymbol];
            if (!appSymbol) continue;

            if (!openPrices[appSymbol]) openPrices[appSymbol] = price;

            const change24h = price - openPrices[appSymbol];
            const changePercent24h = (change24h / openPrices[appSymbol]) * 100;

            send({ type: 'price', symbol: appSymbol, price, change24h, changePercent24h });
          }
        } catch { /* malformed message */ }
      });

      ws.addEventListener('error', () => {
        send({ type: 'error', message: 'WebSocket error' });
      });

      ws.addEventListener('close', () => {
        try { controller.close(); } catch { /* already closed */ }
      });

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        finnhubSymbols.forEach((symbol) => {
          try { ws.send(JSON.stringify({ type: 'unsubscribe', symbol })); } catch { /* ignore */ }
        });
        ws.close();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
