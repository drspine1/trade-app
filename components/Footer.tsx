'use client';

import Link from 'next/link';

const year = new Date().getFullYear();

export function Footer() {
  return (
    <footer
      className="relative mt-16 overflow-hidden"
      style={{ borderTop: '1px solid var(--color-bg-4)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #ff7b02 30%, #e5a55d 50%, #ff7b02 70%, transparent 100%)',
          opacity: 0.6,
        }}
      />
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(255,123,2,0.08) 0%, transparent 70%)' }}
      />

      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
        style={{ background: 'var(--color-bg-2)' }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Left — branding */}
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="PT" width={28} height={28} className="rounded-md opacity-90" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
                Pure Technique
              </p>
              <p className="text-xs" style={{ color: 'var(--color-light)' }}>
                Real-Time Trading Platform
              </p>
            </div>
          </div>

          {/* Center — nav links */}
          <nav className="flex items-center gap-6 text-xs" style={{ color: 'var(--color-light)' }}>
            {[
              { href: '/',          label: 'Market'    },
              { href: '/portfolio', label: 'Portfolio' },
              { href: '/history',   label: 'History'   },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:opacity-100"
                style={{ color: 'var(--color-light)', opacity: 0.7 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-light)')}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right — disclaimer badge */}
          <div className="text-xs text-center md:text-right space-y-0.5">
            <p style={{ color: 'var(--color-light)', opacity: 0.5 }}>
              Simulation only — not financial advice
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-6 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-bg-4), transparent)' }}
        />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p style={{ color: 'var(--color-light)', opacity: 0.45 }}>
            © {year} Pure Technique. All rights reserved.
          </p>

          {/* DevSkeezy credit — premium treatment */}
          <div className="flex items-center gap-3">
            {/* Finnhub attribution */}
            <a
              href="https://finnhub.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-opacity hover:opacity-100"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--color-light)',
                opacity: 0.6,
                textDecoration: 'none',
              }}
            >
              {/* Finnhub lightning bolt icon */}
              <svg width="10" height="13" viewBox="0 0 10 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 0L0 7.5H4.5L4 13L10 5.5H5.5L6 0Z" fill="#e5a55d"/>
              </svg>
              <span>Market data by Finnhub</span>
            </a>

            <span style={{ color: 'var(--color-light)', opacity: 0.45 }}>Designed &amp; built by</span>
            <span
              className="relative font-semibold tracking-wide px-3 py-1 rounded-full text-xs"
              style={{
                background: 'linear-gradient(135deg, rgba(255,123,2,0.15), rgba(229,165,93,0.1))',
                border: '1px solid rgba(255,123,2,0.3)',
                color: 'var(--color-primary-vibrant)',
              }}
            >
              <span
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--color-primary)', boxShadow: '0 0 6px #ff7b02' }}
              />
              <span className="pl-2">DevSkeezy</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
