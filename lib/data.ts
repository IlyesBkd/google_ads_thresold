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
    id: "starter",
    tag: "Starter",
    name: "Starter Threshold Account",
    price: "$50",
    popular: false,
    desc: "A Google Ads account with the billing threshold unlocked at €10. $5 already spent — ready to run campaigns immediately. Also eligible for the €400 free credit promo.",
    features: [
      "€10 billing threshold unlocked",
      "$5 already spent on the account",
      "Run ads now, pay Google later",
      "Login + recovery details included",
      "Instant .txt delivery after payment",
      "Replaced if you can't log in",
      "Bonus: €400 free credit promo eligible",
    ],
  },
  {
    id: "pro",
    tag: "Pro",
    name: "Pro Threshold Account",
    price: "$75",
    popular: true,
    desc: "Higher-tier account with a €50 billing threshold and $10 already spent — more spending room before Google charges you. Also eligible for the €400 free credit promo.",
    features: [
      "€50 billing threshold unlocked",
      "$10 already spent on the account",
      "Run ads now, pay Google later",
      "Extended account age & history",
      "Instant .txt delivery after payment",
      "Replaced if you can't log in",
      "Bonus: €400 free credit promo eligible",
    ],
  },
];

export const faqs: Faq[] = [
  {
    q: "What exactly is a threshold account?",
    a: "It's a Google Ads account where the billing threshold is already unlocked. This means you can run ads and spend up to the threshold amount before Google charges your payment method. You get full control — login, recovery details, everything you need to launch campaigns immediately.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "The Starter has a €10 threshold with $5 already spent — great for testing or small campaigns. The Pro has a €50 threshold with $10 spent — more room to scale before Google bills you, plus a longer account history for better trust signals.",
  },
  {
    q: "What about the €400 free credit promo?",
    a: "All our accounts are eligible for Google's 'spend €400, get €400 free' promotion. Once you start spending on ads, Google will offer you the promo. That means your $50-$75 account can eventually give you access to €800 in total ad spend.",
  },
  {
    q: "How fast do I get the account?",
    a: "Instantly. As soon as your crypto payment is confirmed on-chain, the account credentials are delivered to your email as a .txt file. Most orders land within minutes.",
  },
  {
    q: "What if I can't log in?",
    a: "If you can't log into your account, message us on Telegram and we'll replace it with a fresh one, no questions asked.",
  },
];


// Placeholder wallet addresses — replace with real ones before going live.
export const wallets: Record<PayMethod, string> = {
  BTC: "bc1q8c6f92ptnvz0e7yd3k4r5s9w2x8m4l0q7h3n6",
  ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  USDT: "0x8E2A9bAcD4d31C7656EC7ab88b098defB751B740",
};
