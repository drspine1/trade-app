import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#1e0032',
          border: '1.5px solid #ff7b02',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: '#ff7b02',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          PT
        </span>
      </div>
    ),
    { ...size }
  );
}
