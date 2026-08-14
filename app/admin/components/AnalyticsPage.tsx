'use client';

import { useState } from 'react';
import { COLORS } from './types';

/**
 * Analytics for a dark-only surface (#0C0C0C).
 *
 * Categorical order is fixed and validated for colour-blind separation against
 * that surface; red and yellow are deliberately absent because this panel
 * already reserves them for status. Charts are inline SVG — no chart library
 * for four figures.
 */
const SERIES = ['#4285F4', '#34A853', '#8B6FE0', '#1FA5BF'];

export interface AnalyticsData {
  days: number;
  series: { day: string; revenue: number; sales: number; units: number }[];
  totals: {
    revenue: number;
    sales: number;
    units: number;
    customers: number;
    averageOrder: number;
    prevRevenue: number;
    prevSales: number;
  };
  funnel: { started: number; paid: number; delivered: number; abandoned: number };
  byProduct: { name: string; revenue: number; sales: number; units: number }[];
  byCoin: { coin: string; revenue: number; sales: number }[];
  promo: { withPromo: number; withoutPromo: number };
  claims: { total: number; open: number };
  medianDeliverySeconds: number | null;
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function duration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 90) return `${Math.round(seconds)}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const label: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
};

const card: React.CSSProperties = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  padding: '20px 22px',
};

/** Revenue over time. Area + line, crosshair on hover. */
function RevenueChart({ data }: { data: AnalyticsData['series'] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 200;
  const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...data.map((d) => d.revenue));
  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.revenue)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const active = hover !== null ? data[hover] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
          const i = Math.round((rel / plotW) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[0]} stopOpacity="0.28" />
            <stop offset="100%" stopColor={SERIES[0]} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid: three lines, no axis box. */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + plotH * f}
            y2={PAD.top + plotH * f}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#rev)" />
        <path d={line} fill="none" stroke={SERIES[0]} strokeWidth="2" strokeLinejoin="round" />

        {active && hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1"
            />
            {/* 2px surface ring keeps the dot readable over the line. */}
            <circle
              cx={x(hover)}
              cy={y(active.revenue)}
              r="5"
              fill={SERIES[0]}
              stroke={COLORS.card}
              strokeWidth="2"
            />
          </>
        )}

        <text
          x={PAD.left}
          y={H - 6}
          fill={COLORS.textMuted}
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {data[0]?.day.slice(5)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          fill={COLORS.textMuted}
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {data[data.length - 1]?.day.slice(5)}
        </text>
      </svg>

      {active && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: '#161616',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
            fontSize: 12,
          }}
        >
          <div style={{ color: COLORS.textMuted, fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
            {active.day}
          </div>
          <div style={{ color: COLORS.text, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {usd(active.revenue)}
          </div>
          <div style={{ color: COLORS.textSecondary }}>
            {active.sales} sale{active.sales === 1 ? '' : 's'} · {active.units} account
            {active.units === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}

/** Horizontal magnitude bars with direct labels — no legend needed. */
function BarList({
  rows,
  colorFrom = 0,
}: {
  rows: { key: string; value: number; caption: string }[];
  colorFrom?: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.every((r) => r.value === 0)) {
    return <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>No sales in this period.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((r, i) => (
        <div key={r.key}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}
          >
            <span style={{ fontSize: 13, color: COLORS.text }}>{r.key}</span>
            <span
              style={{
                fontSize: 12.5,
                color: COLORS.textSecondary,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {r.caption}
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
            <div
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                height: '100%',
                background: SERIES[(colorFrom + i) % SERIES.length],
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage({
  data,
  days,
  onChangeDays,
  loading,
}: {
  data: AnalyticsData | null;
  days: number;
  onChangeDays: (d: number) => void;
  loading: boolean;
}) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span style={{ fontSize: 14, color: COLORS.textSecondary }}>Loading analytics…</span>
      </div>
    );
  }

  const { totals, funnel, series, byProduct, byCoin, promo, claims } = data;

  const revenueDelta =
    totals.prevRevenue > 0
      ? Math.round(((totals.revenue - totals.prevRevenue) / totals.prevRevenue) * 100)
      : null;

  const tiles = [
    {
      label: 'Revenue',
      value: usd(totals.revenue),
      note:
        revenueDelta === null
          ? 'no prior period'
          : `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs previous ${days}d`,
      noteColor:
        revenueDelta === null ? COLORS.textMuted : revenueDelta >= 0 ? COLORS.green : COLORS.red,
    },
    {
      label: 'Sales',
      value: String(totals.sales),
      note: `${totals.units} account${totals.units === 1 ? '' : 's'} · ${totals.customers} buyer${totals.customers === 1 ? '' : 's'}`,
      noteColor: COLORS.textSecondary,
    },
    {
      label: 'Average order',
      value: usd(totals.averageOrder),
      note: 'per completed sale',
      noteColor: COLORS.textSecondary,
    },
    {
      label: 'Checkout conversion',
      value: `${pct(funnel.delivered, funnel.started)}%`,
      note: `${funnel.abandoned} abandoned of ${funnel.started}`,
      noteColor: funnel.abandoned > funnel.delivered ? COLORS.yellow : COLORS.textSecondary,
    },
    {
      label: 'Time to deliver',
      value: duration(data.medianDeliverySeconds),
      note: 'median, payment → credentials',
      noteColor: COLORS.textSecondary,
    },
    {
      label: 'Warranty claims',
      value: String(claims.total),
      note: claims.open > 0 ? `${claims.open} still open` : 'none open',
      noteColor: claims.open > 0 ? COLORS.yellow : COLORS.textSecondary,
    },
  ];

  const funnelSteps = [
    { key: 'Checkout started', value: funnel.started },
    { key: 'Payment received', value: funnel.paid },
    { key: 'Delivered', value: funnel.delivered },
  ];

  return (
    <div>
      {/* Range filter, one row above the charts */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={label}>Period</span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            onClick={() => onChangeDays(d)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              background: d === days ? 'rgba(66,133,244,0.14)' : 'transparent',
              border: `1px solid ${d === days ? 'rgba(66,133,244,0.4)' : COLORS.border}`,
              borderRadius: 8,
              color: d === days ? COLORS.primary : COLORS.textSecondary,
              fontSize: 12,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-inter)',
            }}
          >
            {d === 365 ? '1 year' : `${d} days`}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {tiles.map((t) => (
          <div key={t.label} style={card}>
            <div style={{ ...label, marginBottom: 8 }}>{t.label}</div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.text,
                fontFamily: 'var(--font-mono)',
                marginBottom: 5,
              }}
            >
              {t.value}
            </div>
            <div style={{ fontSize: 11.5, color: t.noteColor }}>{t.note}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ ...label, marginBottom: 16 }}>Revenue — last {days} days</div>
        <RevenueChart data={series} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={card}>
          <div style={{ ...label, marginBottom: 18 }}>Where checkouts end up</div>
          <BarList
            rows={funnelSteps.map((s) => ({
              key: s.key,
              value: s.value,
              caption: `${s.value} · ${pct(s.value, funnel.started)}%`,
            }))}
          />
          {funnel.abandoned > 0 && (
            <div
              style={{ marginTop: 16, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5 }}
            >
              <strong style={{ color: COLORS.yellow }}>{funnel.abandoned}</strong> checkout
              {funnel.abandoned === 1 ? '' : 's'} expired without payment. Each one is a recovery
              email already sent.
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ ...label, marginBottom: 18 }}>Revenue by product</div>
          <BarList
            rows={byProduct.map((p) => ({
              key: p.name.replace(' Account', ''),
              value: p.revenue,
              caption: `${usd(p.revenue)} · ${p.units}u`,
            }))}
          />
        </div>

        <div style={card}>
          <div style={{ ...label, marginBottom: 18 }}>Revenue by coin</div>
          <BarList
            rows={byCoin.map((c) => ({
              key: c.coin,
              value: c.revenue,
              caption: `${usd(c.revenue)} · ${c.sales}`,
            }))}
            colorFrom={1}
          />
        </div>

        <div style={card}>
          <div style={{ ...label, marginBottom: 18 }}>Promo code</div>
          <BarList
            rows={[
              {
                key: 'With promo',
                value: promo.withPromo,
                caption: `${promo.withPromo} · ${pct(promo.withPromo, promo.withPromo + promo.withoutPromo)}%`,
              },
              {
                key: 'Full price',
                value: promo.withoutPromo,
                caption: `${promo.withoutPromo} · ${pct(promo.withoutPromo, promo.withPromo + promo.withoutPromo)}%`,
              },
            ]}
            colorFrom={2}
          />
        </div>
      </div>

      {/* The table view the charts are read against. */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 16 }}>Daily breakdown</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
            <thead>
              <tr>
                {['Date', 'Revenue', 'Sales', 'Accounts'].map((h) => (
                  <th
                    key={h}
                    style={{
                      ...label,
                      textAlign: h === 'Date' ? 'left' : 'right',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${COLORS.border}`,
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...series]
                .reverse()
                .filter((d) => d.sales > 0)
                .slice(0, 14)
                .map((d) => (
                  <tr key={d.day}>
                    <td
                      style={{
                        padding: '9px 12px',
                        fontSize: 12.5,
                        color: COLORS.textSecondary,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {d.day}
                    </td>
                    {[usd(d.revenue), d.sales, d.units].map((v, i) => (
                      <td
                        key={i}
                        style={{
                          padding: '9px 12px',
                          fontSize: 12.5,
                          color: COLORS.text,
                          fontFamily: 'var(--font-mono)',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              {series.every((d) => d.sales === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: '18px 12px', fontSize: 12.5, color: COLORS.textMuted }}
                  >
                    No sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
