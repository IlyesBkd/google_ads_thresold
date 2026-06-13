import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TelegramWidget from "@/components/TelegramWidget";
import FloatingLogos from "@/components/FloatingLogos";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
  fallback: ["Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: "GADSCALE — Google Ads Threshold Accounts from $50 | Instant Delivery",
  description:
    "Ready-to-use Google Ads accounts with the billing threshold already unlocked. Run ads now, pay later. All accounts eligible for the €400 free credit promo. From $50, crypto accepted.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
