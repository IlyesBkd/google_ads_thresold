import { ImageResponse } from 'next/og';

// Rendered at build/request time by Next, so the card needs no static asset
// and never drifts from the site's own styling.
export const alt = 'GADSCALE — Google Ads threshold accounts, instant delivery';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GOOGLE = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#080808',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ width: 12, height: 24, borderRadius: 4, background: '#4285F4' }} />
          <div style={{ width: 12, height: 38, borderRadius: 4, background: '#4285F4' }} />
          <div style={{ width: 12, height: 54, borderRadius: 4, background: '#FBBC04' }} />
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#F5F5F5', letterSpacing: -1 }}>
          GADSCALE
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: '#FAFAFA',
            letterSpacing: -3,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Google Ads accounts with the threshold already unlocked
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 34 }}>
          {['Instant delivery', '€400 promo eligible', 'BTC · ETH · USDT'].map((t, i) => (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                fontSize: 24,
                color: '#B5B5B5',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: GOOGLE[i % GOOGLE.length],
                }}
              />
              {t}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontSize: 34, color: '#6A6A6A' }}>From</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#4285F4', letterSpacing: -2 }}>
          $50
        </div>
        <div style={{ fontSize: 30, color: '#6A6A6A', marginLeft: 'auto' }}>gadscale.com</div>
      </div>
    </div>,
    size
  );
}
