import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FF8C00 0%, #FF6B00 100%)',
          borderRadius: '40px',
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-3px',
            marginTop: '-6px',
          }}
        >
          F
        </span>
      </div>
    ),
    { ...size },
  );
}
