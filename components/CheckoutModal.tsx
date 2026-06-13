"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import type { PayMethod, Product } from "@/lib/data";
import { QRCodeSVG } from "qrcode.react";

function pillStyle(active: boolean): CSSProperties {
  const base: CSSProperties = {
    flex: 1,
    padding: "10px",
    borderRadius: "9px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 500,
    transition: "all .15s",
  };
  return active
    ? {
        ...base,
        background: "rgba(66,133,244,0.16)",
        border: "1px solid #4285F4",
        color: "#fff",
      }
    : {
        ...base,
        background: "#101010",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#9A9A9A",
      };
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

const PILLS: { method: PayMethod; label: string }[] = [
  { method: "BTC", label: "₿ BTC" },
  { method: "ETH", label: "Ξ ETH" },
  { method: "USDT", label: "₮ USDT" },
];

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

  // Escape key closes modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

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

  // Poll for payment confirmation in waiting step
  useEffect(() => {
    if (step !== "waiting" || !paymentData) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/by-email?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.success) {
          const order = data.data.orders.find(
            (o: { id: string; status: string }) => o.id === paymentData.orderId
          );
          if (order && (order.status === "delivered" || order.status === "paid")) {
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
    if (!telegramUsername) {
      setError("Please enter your Telegram username");
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
          telegramUsername,
          email: email || null,
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
      onClick={onClose}
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
              <label style={{ display: "block", fontSize: "13px", color: "#9A9A9A", marginBottom: "8px" }}>Choose payment method</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {PILLS.map(({ method, label }) => (
                  <button key={method} onClick={() => setPayMethod(method)} style={pillStyle(payMethod === method)}>
                    {label}
                  </button>
                ))}
              </div>
              {cryptoRates && !ratesLoading && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#6A6A6A", display: "flex", justifyContent: "center", gap: "16px" }}>
                  <span>BTC: ${cryptoRates.BTC?.toLocaleString()}</span>
                  <span>ETH: ${cryptoRates.ETH?.toLocaleString()}</span>
                  <span>USDT: ${cryptoRates.USDT?.toFixed(2)}</span>
                </div>
              )}
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#FBBC04", marginBottom: "4px" }}>
                      {availableStock === 0 ? "Out of stock" : "Low stock!"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#E8D9A8" }}>
                      Get notified on Telegram when we restock
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#E8D9A8", marginBottom: "8px" }}>Your Telegram username</label>
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
                      disabled={waitlistLoading || !telegramUsername}
                      style={{ padding: "10px 20px", background: waitlistLoading || !telegramUsername ? "#5a4a1a" : "#FBBC04", color: waitlistLoading || !telegramUsername ? "#9A9A9A" : "#000", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: waitlistLoading || !telegramUsername ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      {waitlistLoading ? "..." : "Notify me"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {waitlistSuccess && (
              <div style={{ marginTop: "24px", padding: "16px", background: "rgba(52,168,83,0.1)", border: "1px solid rgba(52,168,83,0.25)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <div style={{ fontSize: "13px", color: "#5BD17E" }}>
                  You're on the list! We'll message you on Telegram when we restock.
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Payment Details */}
        {step === "payment" && paymentData && (
          <>
            <div style={{ marginTop: "20px", padding: "14px", background: "rgba(251,188,4,0.06)", border: "1px solid rgba(251,188,4,0.18)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>⏱️</span>
              <div style={{ flex: 1, fontSize: "12.5px", color: "#E8D9A8" }}>
                {timeLeft !== null && timeLeft > 0 ? (
                  <>Time remaining: <strong style={{ color: "#FBBC04" }}>{formatTime(timeLeft)}</strong></>
                ) : (
                  <strong style={{ color: "#EA4335" }}>Payment expired</strong>
                )}
              </div>
            </div>

            <div style={{ marginTop: "18px", fontSize: "13px", color: "#9A9A9A" }}>
              Send exactly {paymentData.payAmount.toFixed(8)} {payMethod}
            </div>

            <div style={{ marginTop: "16px", textAlign: "center", padding: "20px", background: "#080808", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "12px", color: "#9A9A9A", marginBottom: "12px", fontFamily: "var(--font-mono), monospace", letterSpacing: "0.5px" }}>
                SCAN WITH MOBILE WALLET
              </div>
              <div style={{ display: "inline-block", padding: "12px", background: "#FFFFFF", borderRadius: "8px" }}>
                <QRCodeSVG value={paymentData.payAddress} size={180} level="M" includeMargin={false} />
              </div>
            </div>

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", padding: "13px 14px", background: "#080808", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }}>
              <code style={{ fontFamily: "var(--font-mono), monospace", fontSize: "12px", color: "#C5C5C5", wordBreak: "break-all", flex: 1, lineHeight: 1.5 }}>
                {paymentData.payAddress}
              </code>
              <button onClick={handleCopy} style={{ flexShrink: 0, padding: "8px 12px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#F5F5F5", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div style={{ marginTop: "16px", padding: "12px", background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.16)", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "#4285F4", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order ID</div>
              <div style={{ fontSize: "14px", fontFamily: "var(--font-mono), monospace", color: "#F5F5F5" }}>{paymentData.orderId}</div>
            </div>

            <p style={{ margin: "16px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: "#6A6A6A" }}>
              After sending, you'll receive an email with download link within minutes. Check your spam folder if needed.
            </p>

            {paymentData.mockMode && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(251,188,4,0.08)", border: "1px solid rgba(251,188,4,0.2)", borderRadius: "10px", fontSize: "12px", color: "#FBBC04" }}>
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
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#FAFAFA", marginBottom: "8px" }}>
                Payment confirmed!
              </div>
              <div style={{ fontSize: "14px", color: "#9A9A9A", lineHeight: 1.6 }}>
                Your credentials have been sent to<br />
                <strong style={{ color: "#F5F5F5" }}>{email}</strong>
              </div>
            </div>

            <div style={{ padding: "16px", background: "rgba(52,168,83,0.08)", border: "1px solid rgba(52,168,83,0.2)", borderRadius: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "16px" }}>📧</span>
                <span style={{ fontSize: "14px", color: "#5BD17E", fontWeight: 500 }}>Check your inbox</span>
              </div>
              <div style={{ fontSize: "13px", color: "#9A9A9A", lineHeight: 1.5 }}>
                Download link sent to your email. If you don't see it within 2 minutes, check your spam folder.
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
