import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '108px',
        }}
      >
        <span
          style={{
            fontSize: 300,
            fontWeight: 900,
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-8px',
            marginTop: '-20px',
          }}
        >
          F
        </span>
      </div>
    ),
    { ...size },
  );
}
