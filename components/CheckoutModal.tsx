"use client";

import { useState, useEffect, useRef } from "react";
import type { PayMethod, Product } from "@/lib/data";
import { QRCodeSVG } from "qrcode.react";

const COIN_INFO: Record<PayMethod, { name: string; color: string; network: string }> = {
  BTC: { name: "Bitcoin", color: "#F7931A", network: "BTC" },
  ETH: { name: "Ethereum", color: "#627EEA", network: "ERC-20" },
  USDT: { name: "Tether", color: "#26A17B", network: "TRC-20" },
};

function CryptoIcon({ method, size = 28 }: { method: PayMethod; size?: number }) {
  if (method === "BTC") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          fill="#fff"
          d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
        />
      </svg>
    );
  }
  if (method === "ETH") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#fff" fillRule="nonzero">
          <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
          <path d="M16.498 4L9 16.22l7.498-3.35z" />
          <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
          <path d="M16.498 27.995v-6.028L9 17.616z" />
          <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
          <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
      />
    </svg>
  );
}

function Skeleton({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "8px",
        background: "linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        border: "2px solid rgba(255,255,255,0.2)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

const PAY_METHODS: PayMethod[] = ["BTC", "ETH", "USDT"];

export default function CheckoutModal({
  checkout,
  onClose,
}: {
  checkout: Product;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"email" | "payment" | "waiting" | "confirmed">("email");
  const [email, setEmail] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("BTC");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    payAddress: string;
    payAmount: number;
    expiresAt: string;
    mockMode: boolean;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cryptoRates, setCryptoRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  // Focus trap refs
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  // Focus trap: trap focus within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = modal.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modal.addEventListener("keydown", handleTab);
    // Auto-focus first input on open
    setTimeout(() => firstFocusRef.current?.focus(), 50);

    return () => modal.removeEventListener("keydown", handleTab);
  }, [step]);


  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("gadscale_customer_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  // Fetch crypto rates and stock when modal opens
  useEffect(() => {
    const fetchAll = async () => {
      setInitialLoading(true);
      setRatesLoading(true);

      const [ratesResult, stockResult] = await Promise.allSettled([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd').then(r => r.json()),
        fetch('/api/public/stock').then(r => r.json()),
      ]);

      if (ratesResult.status === 'fulfilled') {
        const data = ratesResult.value;
        setCryptoRates({
          BTC: data.bitcoin?.usd || 95000,
          ETH: data.ethereum?.usd || 3500,
          USDT: data.tether?.usd || 1,
        });
      } else {
        setCryptoRates({ BTC: 95000, ETH: 3500, USDT: 1 });
      }

      if (stockResult.status === 'fulfilled' && stockResult.value.success) {
        setAvailableStock(stockResult.value.data[checkout.id] || 0);
      }

      setRatesLoading(false);
      setInitialLoading(false);
    };

    fetchAll();
  }, [checkout.id]);

  // Timer countdown
  useEffect(() => {
    if (!paymentData?.expiresAt) return;

    const interval = setInterval(() => {
      const expiresTime = new Date(paymentData.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, expiresTime - now);
      setTimeLeft(Math.floor(diff / 1000));

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentData]);

  // Poll for payment confirmation in payment or waiting step
  useEffect(() => {
    if ((step !== "waiting" && step !== "payment") || !paymentData) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/by-email?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.success) {
          const order = data.data.orders.find(
            (o: { id: string; status: string; downloadAvailable?: boolean; downloadToken?: string | null }) =>
              o.id === paymentData.orderId
          );
          if (order && (order.status === "delivered" || order.status === "paid")) {
            if (order.downloadAvailable && order.downloadToken) {
              setDownloadToken(order.downloadToken);
            }
            setStep("confirmed");
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Silent retry
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [step, paymentData, email]);

  // On the confirmation screen, keep fetching the download token until it's ready
  // (delivery creates the token a moment after the order is marked paid).
  useEffect(() => {
    if (step !== "confirmed" || !paymentData || downloadToken) return;

    let attempts = 0;
    const tokenInterval = setInterval(async () => {
      attempts++;
      try {
        const response = await fetch(`/api/orders/by-email?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.success) {
          const order = data.data.orders.find(
            (o: { id: string; downloadAvailable?: boolean; downloadToken?: string | null }) =>
              o.id === paymentData.orderId
          );
          if (order?.downloadAvailable && order.downloadToken) {
            setDownloadToken(order.downloadToken);
            clearInterval(tokenInterval);
          }
        }
      } catch {
        // Silent retry
      }
      // Give up after ~1 minute; the emailed link / account page remain available.
      if (attempts >= 12) clearInterval(tokenInterval);
    }, 5000);

    return () => clearInterval(tokenInterval);
  }, [step, paymentData, email, downloadToken]);

  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    if (quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    if (availableStock !== null && quantity > availableStock) {
      setError(`Only ${availableStock} units available`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crypto/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: checkout.id,
          quantity: quantity,
          customerEmail: email,
          coin: payMethod,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Payment creation failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("gadscale_customer_email", email);

      const newPaymentData = {
        orderId: data.data.orderId,
        payAddress: data.data.payAddress,
        payAmount: data.data.payAmount,
        expiresAt: data.data.expiresAt,
        mockMode: data.data.mockMode || false,
      };
      setPaymentData(newPaymentData);

      setStep(newPaymentData.mockMode ? "waiting" : "payment");
      setLoading(false);
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(false);
  };

  const handleCopy = () => {
    if (!paymentData) return;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(paymentData.payAddress);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const basePrice = parseInt(checkout.price.replace("$", ""));
  const totalPrice = basePrice * quantity;

  const handleWaitlistSubmit = async () => {
    const hasEmail = Boolean(email && email.includes("@"));
    const hasTelegram = telegramUsername.trim().length >= 2;

    if (!hasEmail && !hasTelegram) {
      setError("Enter your email or a Telegram username");
      return;
    }

    setWaitlistLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: checkout.id,
          telegramUsername: telegramUsername.trim() || undefined,
          email: hasEmail ? email : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to join waitlist");
        setWaitlistLoading(false);
        return;
      }

      setWaitlistSuccess(true);
      setWaitlistLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setWaitlistLoading(false);
    }
  };

  return (
    <div
      className="anim-overlay-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout for ${checkout.name}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="anim-modal-in"
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0E0E0E",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "28px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "11px", letterSpacing: "0.18em", color: "#6A6A6A" }}>
            {step === "email" ? "CHECKOUT" : step === "payment" ? "PAYMENT" : step === "confirmed" ? "CONFIRMED" : "PROCESSING"}
          </span>
          <button onClick={onClose} aria-label="Close checkout" style={{ background: "none", border: "none", color: "#9A9A9A", fontSize: "24px", cursor: "pointer", lineHeight: 1, padding: 0 }}>
            ×
          </button>
        </div>

        <div style={{ fontSize: "19px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "18px", lineHeight: 1.3 }}>
          {checkout.name}
        </div>

        {/* Amount */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: "#9A9A9A", fontSize: "14px" }}>Amount due</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em" }}>${totalPrice}</span>
            {quantity > 1 && (
              <span style={{ fontSize: "12px", color: "#6A6A6A" }}>
                {checkout.price} × {quantity}
              </span>
            )}
          </div>
        </div>

        {/* Error with Retry */}
        {error && (
          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(234,67,53,0.08)", border: "1px solid rgba(234,67,53,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ color: "#EA4335", fontSize: "13px" }}>{error}</span>
            <button
              onClick={handleRetry}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                background: "rgba(234,67,53,0.12)",
                border: "1px solid rgba(234,67,53,0.3)",
                borderRadius: "8px",
                color: "#EA4335",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {step === "email" && initialLoading && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <Skeleton width="100%" height="44px" />
            <Skeleton width="60%" height="20px" />
            <Skeleton width="100%" height="44px" />
            <div style={{ display: "flex", gap: "8px" }}>
              <Skeleton width="33%" height="40px" />
              <Skeleton width="33%" height="40px" />
              <Skeleton width="33%" height="40px" />
            </div>
          </div>
        )}

        {/* Step 1: Email + Coin Selection */}
        {step === "email" && !initialLoading && (
          <>
            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9A9A9A", marginBottom: "8px" }}>Your email</label>
              <input
                ref={firstFocusRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#080808",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#F5F5F5",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6A6A6A" }}>
                We'll send your account credentials to this email
              </p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9A9A9A", marginBottom: "8px" }}>
                Quantity
                {availableStock !== null && (
                  <span style={{ color: "#6A6A6A", fontWeight: 400 }}> ({availableStock} available)</span>
                )}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: quantity <= 1 ? "#6A6A6A" : "#F5F5F5",
                    fontSize: "20px",
                    cursor: quantity <= 1 ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(availableStock || 999, val)));
                  }}
                  min="1"
                  max={availableStock || 999}
                  aria-label="Quantity"
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#F5F5F5",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    textAlign: "center",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setQuantity(Math.min(availableStock || 999, quantity + 1))}
                  disabled={availableStock !== null && quantity >= availableStock}
                  aria-label="Increase quantity"
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: availableStock !== null && quantity >= availableStock ? "#6A6A6A" : "#F5F5F5",
                    fontSize: "20px",
                    cursor: availableStock !== null && quantity >= availableStock ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9A9A9A", marginBottom: "10px" }}>Pay with</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {PAY_METHODS.map((method) => {
                  const info = COIN_INFO[method];
                  const active = payMethod === method;
                  const estimate = cryptoRates?.[method] ? totalPrice / cryptoRates[method] : null;
                  return (
                    <button
                      key={method}
                      onClick={() => setPayMethod(method)}
                      aria-pressed={active}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "7px",
                        padding: "14px 8px 12px",
                        borderRadius: "13px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all .15s",
                        background: active ? `${info.color}1A` : "#101010",
                        border: active ? `1.5px solid ${info.color}` : "1.5px solid rgba(255,255,255,0.08)",
                        boxShadow: active ? `0 0 0 4px ${info.color}14` : "none",
                      }}
                    >
                      <CryptoIcon method={method} size={30} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: active ? "#fff" : "#D5D5D5" }}>{method}</span>
                        <span style={{ fontSize: "10.5px", color: active ? info.color : "#6A6A6A", fontWeight: 500 }}>{info.name}</span>
                      </div>
                      {estimate !== null && !ratesLoading && (
                        <span style={{ fontSize: "10px", color: "#6A6A6A", fontFamily: "var(--font-mono), monospace" }}>
                          ≈ {method === "USDT" ? estimate.toFixed(2) : estimate.toFixed(method === "BTC" ? 6 : 4)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {ratesLoading && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#6A6A6A", textAlign: "center" }}>
                  Loading rates...
                </div>
              )}
            </div>

            <button
              onClick={handleEmailSubmit}
              disabled={loading || (availableStock !== null && availableStock < quantity)}
              style={{
                marginTop: "24px",
                width: "100%",
                padding: "14px",
                background: loading || (availableStock !== null && availableStock < quantity) ? "#2a5a9a" : "#4285F4",
                color: "#fff",
                border: "none",
                borderRadius: "11px",
                fontWeight: 600,
                fontSize: "15px",
                cursor: loading || (availableStock !== null && availableStock < quantity) ? "not-allowed" : "pointer",
                opacity: loading || (availableStock !== null && availableStock < quantity) ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading && <Spinner />}
              {loading ? "Creating payment..." : availableStock !== null && availableStock < quantity ? "Not enough stock" : "Continue to payment"}
            </button>

            {/* Waitlist */}
            {availableStock !== null && availableStock <= 3 && !waitlistSuccess && (
              <div style={{ marginTop: "24px", padding: "20px", background: "rgba(251,188,4,0.06)", border: "1px solid rgba(251,188,4,0.18)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "20px" }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#FBBC04", marginBottom: "4px" }}>
                      {availableStock === 0 ? "Out of stock" : "Low stock!"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#E8D9A8" }}>
                      Get notified the moment we restock — by email and on our Telegram channel.
                    </div>
                  </div>
                </div>

                <label style={{ display: "block", fontSize: "13px", color: "#E8D9A8", marginBottom: "6px" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: "100%", padding: "10px 12px", background: "#080808", border: "1px solid rgba(251,188,4,0.3)", borderRadius: "8px", color: "#F5F5F5", fontSize: "13px", fontFamily: "inherit", outline: "none", marginBottom: "12px" }}
                />

                <label style={{ display: "block", fontSize: "13px", color: "#E8D9A8", marginBottom: "6px" }}>
                  Telegram username <span style={{ color: "#9A8A5A" }}>(optional)</span>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@username"
                    style={{ flex: 1, padding: "10px 12px", background: "#080808", border: "1px solid rgba(251,188,4,0.3)", borderRadius: "8px", color: "#F5F5F5", fontSize: "13px", fontFamily: "inherit", outline: "none" }}
                  />
                  <button
                    onClick={handleWaitlistSubmit}
                    disabled={waitlistLoading || (!(email && email.includes("@")) && telegramUsername.trim().length < 2)}
                    style={{ padding: "10px 20px", background: waitlistLoading || (!(email && email.includes("@")) && telegramUsername.trim().length < 2) ? "#5a4a1a" : "#FBBC04", color: waitlistLoading || (!(email && email.includes("@")) && telegramUsername.trim().length < 2) ? "#9A9A9A" : "#000", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: waitlistLoading || (!(email && email.includes("@")) && telegramUsername.trim().length < 2) ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {waitlistLoading ? "..." : "Notify me"}
                  </button>
                </div>
              </div>
            )}

            {waitlistSuccess && (
              <div style={{ marginTop: "24px", padding: "16px", background: "rgba(52,168,83,0.1)", border: "1px solid rgba(52,168,83,0.25)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <div style={{ fontSize: "13px", color: "#5BD17E" }}>
                  You're on the list! We'll notify you the moment this is back in stock.
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Payment Details */}
        {step === "payment" && paymentData && (
          <>
            {/* Coin + timer header */}
            <div style={{ marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CryptoIcon method={payMethod} size={34} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#F5F5F5" }}>Pay with {COIN_INFO[payMethod].name} <span style={{ fontSize: "11px", color: "#9A9A9A", fontWeight: 400 }}>({COIN_INFO[payMethod].network})</span></span>
                  <span style={{ fontSize: "11.5px", color: "#6A6A6A" }}>Send the exact amount below</span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 11px",
                  borderRadius: "9px",
                  background: timeLeft !== null && timeLeft > 0 ? "rgba(251,188,4,0.1)" : "rgba(234,67,53,0.1)",
                  border: `1px solid ${timeLeft !== null && timeLeft > 0 ? "rgba(251,188,4,0.22)" : "rgba(234,67,53,0.25)"}`,
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: timeLeft !== null && timeLeft > 0 ? "#FBBC04" : "#EA4335",
                  whiteSpace: "nowrap",
                }}
              >
                {timeLeft !== null && timeLeft > 0 ? (
                  <>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FBBC04", display: "inline-block" }} />
                    {formatTime(timeLeft)}
                  </>
                ) : (
                  "Expired"
                )}
              </div>
            </div>

            {/* Amount to send */}
            <div style={{ marginTop: "16px", padding: "16px", background: `${COIN_INFO[payMethod].color}0D`, border: `1px solid ${COIN_INFO[payMethod].color}33`, borderRadius: "13px" }}>
              <div style={{ fontSize: "11px", color: "#9A9A9A", letterSpacing: "0.04em", marginBottom: "8px", textTransform: "uppercase" }}>Amount to send</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "20px", fontWeight: 600, color: "#fff", wordBreak: "break-all", lineHeight: 1.2 }}>
                  {paymentData.payAmount.toFixed(8)} <span style={{ fontSize: "14px", color: COIN_INFO[payMethod].color }}>{payMethod}</span>
                </span>
                <button
                  onClick={() => {
                    try { navigator.clipboard?.writeText(paymentData.payAmount.toFixed(8)); } catch {}
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  aria-label="Copy amount"
                  style={{ flexShrink: 0, padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F5F5", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* QR code */}
            <div style={{ marginTop: "12px", textAlign: "center", padding: "18px", background: "#080808", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "inline-block", padding: "12px", background: "#FFFFFF", borderRadius: "10px", lineHeight: 0 }}>
                <QRCodeSVG value={paymentData.payAddress} size={172} level="M" includeMargin={false} />
              </div>
              <div style={{ fontSize: "11px", color: "#6A6A6A", marginTop: "11px", letterSpacing: "0.03em" }}>
                Scan with your mobile wallet
              </div>
            </div>

            {/* Address */}
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "11px", color: "#9A9A9A", letterSpacing: "0.04em", marginBottom: "7px", textTransform: "uppercase" }}>{COIN_INFO[payMethod].name} address <span style={{ color: "#F7931A", fontWeight: 600 }}>({COIN_INFO[payMethod].network})</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "13px 14px", background: "#080808", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }}>
                <code style={{ fontFamily: "var(--font-mono), monospace", fontSize: "12px", color: "#C5C5C5", wordBreak: "break-all", flex: 1, lineHeight: 1.5 }}>
                  {paymentData.payAddress}
                </code>
                <button onClick={handleCopy} style={{ flexShrink: 0, padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F5F5", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
              <span style={{ fontSize: "11px", color: "#6A6A6A", letterSpacing: "0.04em", textTransform: "uppercase" }}>Order ID</span>
              <span style={{ fontSize: "12.5px", fontFamily: "var(--font-mono), monospace", color: "#9A9A9A" }}>{paymentData.orderId}</span>
            </div>

            <p style={{ margin: "14px 0 0", fontSize: "12px", lineHeight: 1.6, color: "#6A6A6A", textAlign: "center" }}>
              Credentials are emailed automatically within minutes of confirmation. Check spam if needed.
            </p>

            {paymentData.mockMode && (
              <div style={{ marginTop: "14px", padding: "12px", background: "rgba(251,188,4,0.08)", border: "1px solid rgba(251,188,4,0.2)", borderRadius: "10px", fontSize: "12px", color: "#FBBC04" }}>
                🎭 <strong>MOCK MODE:</strong> Payment will be auto-confirmed in 10 seconds (dev testing)
              </div>
            )}
          </>
        )}

        {/* Step 3: Waiting for confirmation */}
        {step === "waiting" && paymentData && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <span style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid rgba(66,133,244,0.2)", borderTopColor: "#4285F4", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#FAFAFA", marginBottom: "8px" }}>
                Processing payment...
              </div>
              <div style={{ fontSize: "13px", color: "#9A9A9A", lineHeight: 1.6 }}>
                This usually takes 10-15 seconds.<br />
                You'll receive an email once confirmed.
              </div>
            </div>

            <div style={{ padding: "12px", background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.16)", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "#4285F4", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order ID</div>
              <div style={{ fontSize: "14px", fontFamily: "var(--font-mono), monospace", color: "#F5F5F5" }}>{paymentData.orderId}</div>
            </div>
          </>
        )}

        {/* Step 4: Confirmation */}
        {step === "confirmed" && paymentData && (
          <>
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", background: "rgba(52,168,83,0.12)", border: "1px solid rgba(52,168,83,0.3)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#FAFAFA", marginBottom: "8px" }}>
                Payment confirmed!
              </div>
              <div style={{ fontSize: "14px", color: "#9A9A9A", lineHeight: 1.6 }}>
                Your credentials have been sent to<br />
                <strong style={{ color: "#F5F5F5" }}>{email}</strong>
              </div>
            </div>

            {/* Direct download (.txt) */}
            {downloadToken ? (
              <a
                href={`/download/${downloadToken}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "14px",
                  background: "#34A853",
                  color: "#fff",
                  border: "none",
                  borderRadius: "11px",
                  fontSize: "15px",
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  cursor: "pointer",
                  marginBottom: "16px",
                }}
              >
                ⬇ Download credentials (.txt)
              </a>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "14px", background: "rgba(52,168,83,0.08)", border: "1px solid rgba(52,168,83,0.2)", borderRadius: "11px", marginBottom: "16px", fontSize: "13px", color: "#9A9A9A" }}>
                <Spinner />
                Preparing your download…
              </div>
            )}

            <div style={{ padding: "16px", background: "rgba(52,168,83,0.08)", border: "1px solid rgba(52,168,83,0.2)", borderRadius: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "16px" }}>📧</span>
                <span style={{ fontSize: "14px", color: "#5BD17E", fontWeight: 500 }}>Also sent to your inbox</span>
              </div>
              <div style={{ fontSize: "13px", color: "#9A9A9A", lineHeight: 1.5 }}>
                A download link was emailed to you as a backup. If you don't see it within 2 minutes, check your spam folder.
              </div>
            </div>

            <div style={{ padding: "12px", background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.16)", borderRadius: "10px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "#4285F4", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order ID</div>
              <div style={{ fontSize: "14px", fontFamily: "var(--font-mono), monospace", color: "#F5F5F5" }}>{paymentData.orderId}</div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href="/account"
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "#4285F4",
                  color: "#fff",
                  border: "none",
                  borderRadius: "11px",
                  fontSize: "14px",
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                View My Orders
              </a>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "transparent",
                  color: "#9A9A9A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "11px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
