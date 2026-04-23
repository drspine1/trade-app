import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pure Technique — Real-Time Trading Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #140021 0%, #1e0032 50%, #25003e 100%)',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Grid lines background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,123,2,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,123,2,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow orb */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,123,2,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #25003e, #140021)',
            border: '3px solid rgba(255,123,2,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: '#ff7b02',
              letterSpacing: '-2px',
            }}
          >
            PT
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#e8d8f4',
            letterSpacing: '-2px',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          Pure Technique
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#d0b8e0',
            opacity: 0.8,
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          Real-Time Stock &amp; Crypto Trading Platform
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['Live Prices', 'Portfolio Tracking', 'Interactive Charts'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 24px',
                borderRadius: 100,
                background: 'rgba(255,123,2,0.12)',
                border: '1px solid rgba(255,123,2,0.35)',
                color: '#e5a55d',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, transparent, #ff7b02, #e5a55d, #ff7b02, transparent)',
          }}
        />

        {/* DevSkeezy credit */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 40,
            fontSize: 16,
            color: 'rgba(208,184,224,0.5)',
          }}
        >
          by DevSkeezy
        </div>
      </div>
    ),
    { ...size }
  );
}
