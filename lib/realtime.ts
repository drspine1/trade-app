/**
 * RealtimeEngine — live market price feed with simulation fallback.
 *
 * Mode 1 — LIVE (Finnhub SSE):
 *   Connects to /api/market-stream which proxies Finnhub WebSocket server-side.
 *   Used when FINNHUB_API_KEY is configured.
 *
 * Mode 2 — SIMULATION (fallback):
 *   Uses setInterval with bounded random price movements.
 *   Used when the SSE endpoint returns 503 (no API key) or on connection error.
 *
 * The rest of the app (useAssets hook, Zustand store) is identical in both modes —
 * they just receive (symbol, price, change24h, changePercent24h) callbacks.
 */

type PriceCallback = (
  newPrice: number,
  change24h: number,
  changePercent24h: number
) => void;

interface Subscription {
  symbol: string;
  initialPrice: number;
  callback: PriceCallback;
}

export class RealtimeEngine {
  // Simulation state
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private volatilityMap: Map<string, number> = new Map();

  // SSE state
  private eventSource: EventSource | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private mode: 'live' | 'simulation' | 'pending' = 'pending';

  constructor() {
    this.volatilityMap.set('BTC',   0.03);
    this.volatilityMap.set('ETH',   0.035);
    this.volatilityMap.set('AAPL',  0.01);
    this.volatilityMap.set('GOOGL', 0.012);
    this.volatilityMap.set('MSFT',  0.011);
    this.volatilityMap.set('TSLA',  0.025);
    this.volatilityMap.set('AMZN',  0.015);
    this.volatilityMap.set('NFLX',  0.02);
  }

  /**
   * Register a symbol for price updates.
   * Call this for each asset after fetching the initial asset list.
   * The engine will batch all subscriptions and open a single SSE connection.
   */
  startPriceUpdate(
    symbol: string,
    initialPrice: number,
    callback: PriceCallback,
    intervalMs: number = 2000,
    throttleMs: number = 500
  ): void {
    // Store subscription regardless of mode
    this.subscriptions.set(symbol, { symbol, initialPrice, callback });

    if (this.mode === 'simulation') {
      // Already in simulation mode — start interval directly
      this._startSimulation(symbol, initialPrice, callback, intervalMs, throttleMs);
    }
    // If mode is 'live' or 'pending', the SSE connection handles it
  }

  /**
   * Connect to the SSE stream for all registered symbols.
   * Call this once after all startPriceUpdate() calls.
   */
  connect(symbols: string[]): void {
    if (typeof window === 'undefined') return; // SSR guard
    if (symbols.length === 0) return;

    const url = `/api/market-stream?symbols=${symbols.join(',')}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'connected') {
          this.mode = 'live';
          return;
        }

        if (msg.type === 'price') {
          const sub = this.subscriptions.get(msg.symbol);
          if (sub) {
            sub.callback(msg.price, msg.change24h, msg.changePercent24h);
          }
        }
      } catch { /* malformed message */ }
    };

    this.eventSource.onerror = () => {
      // SSE failed — fall back to simulation for all subscribed symbols
      this._fallbackToSimulation();
    };
  }

  private _fallbackToSimulation(): void {
    if (this.mode === 'simulation') return; // already fallen back
    this.mode = 'simulation';

    // Close the broken SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Start simulation for every registered subscription
    this.subscriptions.forEach(({ symbol, initialPrice, callback }) => {
      this._startSimulation(symbol, initialPrice, callback, 2000, 500);
    });
  }

  private _startSimulation(
    symbol: string,
    initialPrice: number,
    callback: PriceCallback,
    intervalMs: number,
    throttleMs: number
  ): void {
    // Dedup — stop existing interval first
    this._stopSimulation(symbol);

    let basePrice = initialPrice;
    let trend = (Math.random() - 0.5) * 0.02;
    const volatility = this.volatilityMap.get(symbol) ?? 0.02;
    const lowerBound = initialPrice * 0.5;
    const upperBound = initialPrice * 1.5;
    let lastEmitTime = 0;

    const id = setInterval(() => {
      const randomChange = (Math.random() - 0.5) * volatility * basePrice;
      basePrice += randomChange + trend * basePrice;
      basePrice = Math.max(lowerBound, Math.min(upperBound, basePrice));

      if (Math.random() < 0.1) trend = (Math.random() - 0.5) * 0.02;
      if (Math.abs(trend) > 0.01) trend *= 0.95;

      const change24h = basePrice - initialPrice;
      const changePercent24h = (change24h / initialPrice) * 100;

      if (throttleMs === 0) {
        callback(basePrice, change24h, changePercent24h);
        return;
      }
      const now = Date.now();
      if (now - lastEmitTime >= throttleMs) {
        lastEmitTime = now;
        callback(basePrice, change24h, changePercent24h);
      }
    }, intervalMs);

    this.intervals.set(symbol, id);
  }

  private _stopSimulation(symbol: string): void {
    const id = this.intervals.get(symbol);
    if (id !== undefined) {
      clearInterval(id);
      this.intervals.delete(symbol);
    }
  }

  stopPriceUpdate(symbol: string): void {
    this.subscriptions.delete(symbol);
    this._stopSimulation(symbol);
  }

  stopAll(): void {
    // Stop simulation intervals
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals.clear();

    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.subscriptions.clear();
    this.mode = 'pending';
  }

  get activeCount(): number {
    return this.subscriptions.size;
  }

  get currentMode(): 'live' | 'simulation' | 'pending' {
    return this.mode;
  }
}

export const realtimeEngine = new RealtimeEngine();
