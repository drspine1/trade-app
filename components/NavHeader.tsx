'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { usePortfolioStore } from '@/lib/store';
import { BarChart2, Briefcase, History } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Market', icon: BarChart2 },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/history', label: 'History', icon: History },
];

export function NavHeader() {
  const pathname = usePathname();
  const portfolio = usePortfolioStore((s) => s.portfolio);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur border-b"
      style={{
        background: 'color-mix(in srgb, var(--color-bg-2) 92%, transparent)',
        borderColor: 'var(--color-bg-4)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image src="/favicon.svg" alt="Pure Technique" width={32} height={32} className="rounded-lg" />
          <span className="hidden sm:inline text-sm font-normal" style={{ color: 'var(--color-light)' }}>
            Pure Technique
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--color-bg-4)' : 'transparent',
                  color: isActive ? 'var(--color-white)' : 'var(--color-light)',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live portfolio value */}
        {portfolio && (
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: 'var(--color-light)' }}>Portfolio Value</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
              ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
