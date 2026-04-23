'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar,
} from 'recharts';
import { Asset } from '@/lib/store';
import { format, subMinutes, subHours, subDays, subWeeks } from 'date-fns';

type Timeframe = '1H' | '24H' | '7D' | '1M' | '1Y';
type ChartType = 'line' | 'candlestick';

interface LinePoint  { time: string; price: number; }
interface OHLCPoint  {
  time: string; open: number; high: number; low: number; close: number;
  range: [number, number]; body: [number, number]; isUp: boolean;
}

function generateChartData(asset: Asset, timeframe: Timeframe, chartType: ChartType): LinePoint[] | OHLCPoint[] {
  const config: Record<Timeframe, { count: number; stepFn: (d: Date, i: number) => Date; fmt: string }> = {
    '1H':  { count: 60, stepFn: (d, i) => subMinutes(d, i), fmt: 'HH:mm' },
    '24H': { count: 24, stepFn: (d, i) => subHours(d, i),   fmt: 'HH:mm' },
    '7D':  { count: 7,  stepFn: (d, i) => subDays(d, i),    fmt: 'MMM d' },
    '1M':  { count: 30, stepFn: (d, i) => subDays(d, i),    fmt: 'MMM d' },
    '1Y':  { count: 52, stepFn: (d, i) => subWeeks(d, i),   fmt: 'MMM d' },
  };
  const { count, stepFn, fmt } = config[timeframe];
  const now = new Date();
  let price = asset.currentPrice;
  const points: LinePoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 0.015 * price;
    price = Math.max(price + change, asset.lowPrice * 0.8);
    price = Math.min(price, asset.highPrice * 1.2);
    points.push({ time: format(stepFn(now, i), fmt), price: parseFloat(price.toFixed(2)) });
  }

  if (chartType === 'line') return points;

  return points.map((p, idx) => {
    const prev = idx > 0 ? points[idx - 1].price : p.price;
    const open  = parseFloat(prev.toFixed(2));
    const close = p.price;
    const wick  = Math.abs(close - open) * (0.5 + Math.random() * 0.5);
    const high  = parseFloat((Math.max(open, close) + wick).toFixed(2));
    const low   = parseFloat((Math.min(open, close) - wick).toFixed(2));
    return { time: p.time, open, high, low, close,
      range: [low, high] as [number, number],
      body:  [Math.min(open, close), Math.max(open, close)] as [number, number],
      isUp: close >= open };
  });
}

interface CandleProps {
  x?: number; y?: number; width?: number; height?: number;
  payload?: OHLCPoint;
  background?: { y: number; height: number };
  fill?: string;
}

function CandleShape({ x = 0, width = 0, payload, background, fill }: CandleProps) {
  if (!payload || !background) return null;
  const { open, high, low, close, isUp } = payload;
  const color = fill ?? (isUp ? '#4ade80' : '#f87171');
  const chartTop = background.y;
  const chartHeight = background.height;
  const priceRange = high - low;
  if (priceRange === 0) return null;
  const toY = (p: number) => chartTop + chartHeight * (1 - (p - low) / priceRange);
  const bodyTop    = toY(Math.max(open, close));
  const bodyBottom = toY(Math.min(open, close));
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
  const wickX = x + width / 2;
  return (
    <g>
      <line x1={wickX} y1={toY(high)} x2={wickX} y2={toY(low)} stroke={color} strokeWidth={1.5} />
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 1)} height={bodyHeight} fill={color} />
    </g>
  );
}

const TIMEFRAMES: Timeframe[] = ['1H', '24H', '7D', '1M', '1Y'];

export function AssetChart({ asset }: { asset: Asset | null }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [chartType, setChartType] = useState<ChartType>('line');

  const chartData = useMemo(
    () => (asset ? generateChartData(asset, timeframe, chartType) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asset?.symbol, asset?.currentPrice, timeframe, chartType]
  );

  if (!asset) {
    return (
      <div
        className="w-full h-64 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
      >
        <p style={{ color: 'var(--color-light)' }}>Select an asset to view chart</p>
      </div>
    );
  }

  const isPositive = asset.changePercent24h >= 0;
  const lineColor  = isPositive ? '#4ade80' : '#f87171';

  const tooltipStyle = {
    contentStyle: {
      background: '#1e0032',
      border: '2px solid var(--color-primary)',
      borderRadius: '8px',
      color: 'hsl(0, 0%, 95%)',
      padding: '8px 12px',
    },
    labelStyle: { color: 'hsl(0, 0%, 95%)', fontWeight: 600 },
  };

  return (
    <div
      className="w-full rounded-xl p-6"
      style={{ background: '#1a0029', border: '1px solid var(--color-bg-4)' }}
    >
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-white)' }}>
            {asset.symbol} / USD
          </h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-white)' }}>
            ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
            {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}% ({timeframe})
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* Timeframe */}
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: timeframe === tf ? 'var(--color-primary)' : 'var(--color-bg-4)',
                  color: timeframe === tf ? 'var(--color-bg-1)' : 'var(--color-light)',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          {/* Chart type */}
          <div className="flex gap-1">
            {(['line', 'candlestick'] as ChartType[]).map((ct) => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize"
                style={{
                  background: chartType === ct ? 'var(--color-primary-vibrant)' : 'var(--color-bg-4)',
                  color: chartType === ct ? 'var(--color-bg-1)' : 'var(--color-light)',
                }}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'line' ? (
          <LineChart data={chartData as LinePoint[]}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.8} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(208,184,224,0.15)" />
            <XAxis dataKey="time" stroke="#d0b8e0" tick={{ fill: '#e8d8f4', fontSize: 11 }} />
            <YAxis stroke="#d0b8e0" tick={{ fill: '#e8d8f4', fontSize: 11 }}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']} />
            <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} fill="url(#colorPrice)" />
          </LineChart>
        ) : (
          <ComposedChart data={chartData as OHLCPoint[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(208,184,224,0.15)" />
            <XAxis dataKey="time" stroke="#d0b8e0" tick={{ fill: '#e8d8f4', fontSize: 11 }} />
            <YAxis stroke="#d0b8e0" tick={{ fill: '#e8d8f4', fontSize: 11 }}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <Tooltip {...tooltipStyle} formatter={(v: unknown, name: string) => {
              if (Array.isArray(v)) return [`$${(v[0] as number).toFixed(2)} – $${(v[1] as number).toFixed(2)}`, name];
              return [`$${(v as number).toFixed(2)}`, name];
            }} />
            <Bar
              dataKey="range"
              shape={(props: CandleProps & { payload?: OHLCPoint }) => {
                const isUp = props.payload?.isUp ?? true;
                const color = isUp ? '#4ade80' : '#ff7b02'; // green up, orange down
                return <CandleShape {...props} fill={color} />;
              }}
              isAnimationActive={false}
            />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
