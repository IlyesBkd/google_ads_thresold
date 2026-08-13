import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import TelegramWidget from '@/components/TelegramWidget';
import FloatingLogos from '@/components/FloatingLogos';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
  fallback: ['Menlo', 'Consolas', 'monospace'],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.gadscale.com';

const TITLE = 'GADSCALE — Google Ads Threshold Accounts from $50 | Instant Delivery';
const DESCRIPTION =
  'Ready-to-use Google Ads accounts with the billing threshold already unlocked. Run ads now, pay later. All accounts eligible for the €400 free credit promo. From $50, crypto accepted.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'GADSCALE',
  keywords: [
    'google ads threshold account',
    'google ads account for sale',
    'threshold unlocked',
    'buy google ads account crypto',
  ],
  alternates: { canonical: '/' },
  // The shop is shared as links in Telegram chats and channels — these tags
  // are what turn a bare URL into a card with a title, price and image.
  openGraph: {
    type: 'website',
    siteName: 'GADSCALE',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <FloatingLogos />
        {children}
        <TelegramWidget />
      </body>
    </html>
  );
}
