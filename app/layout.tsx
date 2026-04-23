import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { NavHeader } from '@/components/NavHeader';
import { PriceTicker } from '@/components/PriceTicker';
import { Footer } from '@/components/Footer';
import { Suspense } from 'react';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Pure Technique — Real-Time Trading Platform',
  description: 'Simulate real-time stock and crypto trading with live price feeds, interactive charts, and portfolio tracking.',
  generator: 'Pure Technique',
  keywords: ['trading', 'stocks', 'crypto', 'real-time', 'portfolio', 'bitcoin', 'finance'],
  authors: [{ name: 'Pure Technique' }],
  openGraph: {
    title: 'Pure Technique — Real-Time Trading Platform',
    description: 'Live market data, interactive charts, and simulated buy/sell trading.',
    type: 'website',
    siteName: 'Pure Technique',
  },
  twitter: {
    card: 'summary',
    title: 'Pure Technique — Real-Time Trading Platform',
    description: 'Live market data, interactive charts, and simulated buy/sell trading.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        {/* Persistent navigation — client component */}
        <Suspense fallback={null}>
          <NavHeader />
        </Suspense>
        {/* Live price ticker strip — client component */}
        <Suspense fallback={null}>
          <PriceTicker />
        </Suspense>
        {/* Page content */}
        {children}
        {/* Footer */}
        <Footer />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
