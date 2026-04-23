import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg-1)' }}
    >
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-bold" style={{ color: 'var(--color-bg-4)' }}>404</h1>
        <p className="text-xl" style={{ color: 'var(--color-light)' }}>Page not found</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 font-semibold rounded-lg transition-colors"
          style={{ background: 'var(--color-primary)', color: 'var(--color-bg-1)' }}
        >
          Back to Market
        </Link>
      </div>
    </main>
  );
}
