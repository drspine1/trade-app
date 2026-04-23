import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#1e0032',
          border: '5px solid #ff7b02',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ff7b02',
            letterSpacing: '-3px',
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
