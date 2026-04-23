'use client';

import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioCard } from '@/components/PortfolioCard';

export default function PortfolioPage() {
  const { portfolio, loading, error, refetch } = usePortfolio();

  if (loading) {
    return (
      <main className="min-h-screen p-6" style={{ background: 'var(--color-bg-1)' }}>
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{ height: i === 1 ? '2rem' : i === 2 ? '16rem' : '12rem', background: 'var(--color-bg-3)' }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--color-bg-1)' }}>
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: '#f87171' }}>{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--color-primary)', color: 'var(--color-bg-1)' }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-2 md:px-6 p-6" style={{ background: 'var(--color-bg-1)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-white)' }}>Portfolio</h1>
        {portfolio
          ? <PortfolioCard portfolio={portfolio} />
          : <p style={{ color: 'var(--color-light)' }}>No portfolio data available.</p>
        }
      </div>
    </main>
  );
}
