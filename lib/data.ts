export type Product = {
  id: string;
  tag: string;
  name: string;
  price: string;
  popular: boolean;
  desc: string;
  features: string[];
};

export type Faq = {
  q: string;
  a: string;
};

export type PayMethod = "BTC" | "ETH" | "USDT";

export const products: Product[] = [
  {
    id: "350",
    tag: "Standard",
    name: "$350 Threshold Account",
    price: "$189",
    popular: false,
    desc: "An aged, fully verified Google Ads account with a $350 billing threshold unlocked — spend first, pay Google later. Delivered instantly.",
    features: [
      "$350 billing threshold unlocked",
      "Aged & warmed billing profile",
      "Login + recovery details included",
      "Instant .txt delivery after payment",
      "24h replacement warranty",
      "Setup guide + Discord support",
    ],
  },
  {
    id: "500",
    tag: "Pro",
    name: "$500 Threshold Account",
    price: "$279",
    popular: true,
    desc: "Higher-limit account with a $500 threshold and a longer billing history — built to scale spend from day one.",
    features: [
      "$500 billing threshold unlocked",
      "Extended account age & history",
      "Login + recovery details included",
      "Instant .txt delivery after payment",
      "48h replacement warranty",
      "Priority Discord support",
    ],
  },
];

export const faqs: Faq[] = [
  {
    q: "What exactly is a threshold account?",
    a: "It's an aged Google Ads account with the billing threshold already unlocked. That means you can run ads and spend up to the threshold before Google charges you — no upfront card hold or warm-up needed. You get the login and recovery details and full control of the account.",
  },
  {
    q: "How fast do I get it?",
    a: "Instantly. As soon as your payment is confirmed on-chain, the account credentials are delivered to you as a .txt file and posted in our Discord. Most orders land within minutes.",
  },
  {
    q: "What if a login doesn't work?",
    a: "Every account is covered by a replacement warranty (24h on Standard, 48h on Pro). If a login fails on arrival, message us in Discord with your order ID and we'll swap it for a fresh account, no questions asked.",
  },
  {
    q: "Which cryptocurrencies do you accept?",
    a: "Bitcoin (BTC), Ethereum (ETH), and USDT. A wallet address for your chosen coin is shown at checkout — send the exact amount and share the transaction hash in Discord.",
  },
];

export const feedData: string[] = [
  "A media buyer in Berlin grabbed a $500 account · just now",
  "An agency in Toronto bought 3 threshold accounts · 2m ago",
  "A founder in Austin picked up a $350 account · 5m ago",
  "A buyer in Lisbon restocked for the 4th time · 8m ago",
  "A team in Dubai stocked up on 5 accounts · 12m ago",
];

// Placeholder wallet addresses — replace with real ones before going live.
export const wallets: Record<PayMethod, string> = {
  BTC: "bc1q8c6f92ptnvz0e7yd3k4r5s9w2x8m4l0q7h3n6",
  ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  USDT: "0x8E2A9bAcD4d31C7656EC7ab88b098defB751B740",
};
