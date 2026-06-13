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
  {
    q: "Which cryptocurrencies do you accept?",
    a: "We accept Bitcoin (BTC), Ethereum (ETH), and USDT (TRC-20). Select your preferred coin at checkout — you'll receive a wallet address and the exact amount to send.",
  },
  {
    q: "Can I buy multiple accounts?",
    a: "Yes. You can select the quantity at checkout. Each account comes with its own unique credentials. Bulk buyers often use multiple accounts to diversify their ad spend across campaigns.",
  },
  {
    q: "How does the billing threshold work?",
    a: "Google Ads uses a threshold billing system — instead of charging you upfront, they let you accumulate a certain amount of ad spend before billing your payment method. Our accounts already have this threshold unlocked, so you can start spending immediately.",
  },
  {
    q: "What do I receive exactly?",
    a: "You receive a .txt file containing the Google Ads account email, password, and recovery details. Everything you need to log in and start running campaigns right away.",
  },
  {
    q: "Do you offer refunds?",
    a: "Due to the nature of digital goods, we don't offer refunds once credentials are delivered. However, if the account doesn't work on arrival (can't log in), we replace it immediately — just message us on Telegram.",
  },
  {
    q: "How do I contact support?",
    a: "Message us directly on Telegram at @Selling_GAds. We typically respond within a few minutes during business hours.",
  },
];
