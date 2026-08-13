'use client';

import { useEffect, useState } from 'react';

interface Sale {
  productName: string;
  quantity: number;
  coin: string;
  hoursAgo: number;
}

function ago(hours: number): string {
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function RecentSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/public/recent-sales')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSales(d.data.sales);
          setTotal(d.data.soldLast30Days);
        }
      })
      .catch(() => {});
  }, []);

  // Nothing to brag about yet — show nothing rather than an empty shelf.
  if (sales.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '0 24px clamp(30px,5vw,54px)',
      }}
    >
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          background: '#0A0A0A',
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#34A853',
              boxShadow: '0 0 0 3px rgba(52,168,83,0.18)',
            }}
          />
          <span style={{ fontSize: '13.5px', color: '#C8C8C8', fontWeight: 500 }}>
            {total} account{total === 1 ? '' : 's'} delivered in the last 30 days
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sales.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                background: '#0F0F0F',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '999px',
                fontSize: '12px',
                color: '#9A9A9A',
              }}
            >
              <span style={{ color: '#34A853' }}>✓</span>
              <span style={{ color: '#C8C8C8' }}>
                {s.productName}
                {s.quantity > 1 && ` ×${s.quantity}`}
              </span>
              <span style={{ color: '#4A4A4A' }}>·</span>
              <span>{s.coin}</span>
              <span style={{ color: '#4A4A4A' }}>·</span>
              <span>{ago(s.hoursAgo)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
