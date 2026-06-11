import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TelegramWidget from "@/components/TelegramWidget";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADSCALE — Google Ads threshold accounts, delivered instantly",
  description:
    "Aged, fully verified Google Ads accounts with the billing threshold already unlocked — spend before you pay Google. Instant .txt delivery, crypto accepted, replacement warranty.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <TelegramWidget />
      </body>
    </html>
  );
}
