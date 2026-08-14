import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for the terms / refunds / privacy pages.
 * Matches the shop's dark styling so these don't read as bolted on.
 */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#F5F5F5',
        fontFamily: 'var(--font-inter), sans-serif',
      }}
    >
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '18px 24px' }}>
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#F5F5F5',
              textDecoration: 'none',
              letterSpacing: '0.5px',
            }}
          >
            GADSCALE
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6A6A6A', textDecoration: 'none' }}>
            Back to shop
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 24px 96px' }}>
        <h1
          style={{
            fontSize: 'clamp(28px,5vw,38px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            margin: '0 0 10px',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#6A6A6A',
            fontFamily: 'var(--font-mono), monospace',
            margin: '0 0 40px',
          }}
        >
          Last updated {updated}
        </p>

        <div className="legal-body">{children}</div>

        <div
          style={{
            marginTop: '56px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            gap: '22px',
            flexWrap: 'wrap',
            fontSize: '13px',
          }}
        >
          <Link href="/guide" style={{ color: '#6A6A6A', textDecoration: 'none' }}>
            Getting started
          </Link>
          <Link href="/terms" style={{ color: '#6A6A6A', textDecoration: 'none' }}>
            Terms
          </Link>
          <Link href="/refunds" style={{ color: '#6A6A6A', textDecoration: 'none' }}>
            Refunds
          </Link>
          <Link href="/privacy" style={{ color: '#6A6A6A', textDecoration: 'none' }}>
            Privacy
          </Link>
          <a
            href="https://t.me/googleads_now"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6A6A6A', textDecoration: 'none' }}
          >
            Telegram support
          </a>
        </div>
      </main>
    </div>
  );
}
