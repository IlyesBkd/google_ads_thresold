"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  coin: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  downloadAvailable: boolean;
  downloadToken: string | null;
  tokenExpiresAt: string | null;
  tokenUsesLeft: number | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "#FBBC04", bg: "rgba(251,188,4,0.1)", label: "Pending" },
  paid: { color: "#4285F4", bg: "rgba(66,133,244,0.1)", label: "Paid" },
  delivered: { color: "#34A853", bg: "rgba(52,168,83,0.1)", label: "Delivered" },
  failed: { color: "#EA4335", bg: "rgba(234,67,53,0.1)", label: "Failed" },
  refunded: { color: "#9A9A9A", bg: "rgba(154,154,154,0.1)", label: "Refunded" },
};

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("gadscale_customer_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSearch = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(
        `/api/orders/by-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to fetch orders");
        setOrders([]);
      } else {
        setOrders(data.data.orders);
        localStorage.setItem("gadscale_customer_email", email);
      }
    } catch {
      setError("Network error. Please try again.");
      setOrders([]);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `${Math.floor(hours / 24)}d left` : `${hours}h left`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#F5F5F5", fontFamily: "var(--font-inter), sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "18px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontSize: "15px", fontWeight: 700, color: "#F5F5F5", textDecoration: "none", letterSpacing: "0.5px" }}>
            GADSCALE
          </Link>
          <Link href="/" style={{ fontSize: "13px", color: "#6A6A6A", textDecoration: "none" }}>
            Back to shop
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Title */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "8px" }}>
            My Orders
          </h1>
          <p style={{ fontSize: "14px", color: "#6A6A6A" }}>
            Track your orders and download account credentials.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "36px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter your email"
            disabled={loading}
            style={{
              flex: 1,
              padding: "14px 16px",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "#F5F5F5",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !email}
            style={{
              padding: "14px 24px",
              background: loading || !email ? "#1a3a6a" : "#4285F4",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading || !email ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading || !email ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: "24px", padding: "14px 16px", background: "rgba(234,67,53,0.06)", border: "1px solid rgba(234,67,53,0.15)", borderRadius: "12px", fontSize: "13px", color: "#EA4335" }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {searched && !loading && orders.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px" }}>
              📦
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No orders found</div>
            <p style={{ fontSize: "13px", color: "#6A6A6A", maxWidth: "340px", margin: "0 auto" }}>
              No orders for this email. Make sure you're using the same one from checkout.
            </p>
          </div>
        )}

        {/* Orders list */}
        {orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  style={{
                    background: "#0C0C0C",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                        {order.productName || `Order`}
                        {order.quantity > 1 && <span style={{ color: "#6A6A6A", fontWeight: 400 }}> ×{order.quantity}</span>}
                      </div>
                      <div style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "#4A4A4A" }}>
                        {order.id.substring(0, 12)}
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: status.color, background: status.bg, padding: "4px 10px", borderRadius: "6px" }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Info row */}
                  <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#6A6A6A", marginBottom: "14px" }}>
                    <span>${(order.amount / 100).toFixed(0)} {order.coin}</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>

                  {/* Download button */}
                  {order.status === "delivered" && order.downloadAvailable && order.downloadToken && (
                    <div>
                      <Link
                        href={`/download/${order.downloadToken}`}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px",
                          background: "#4285F4",
                          color: "#fff",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 600,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        Download credentials
                      </Link>
                      <div style={{ marginTop: "8px", textAlign: "center", fontSize: "11px", color: "#4A4A4A" }}>
                        {order.tokenUsesLeft !== null && order.tokenUsesLeft > 0
                          ? `${order.tokenUsesLeft} download${order.tokenUsesLeft > 1 ? "s" : ""} left`
                          : "No downloads left"}
                        {" · "}
                        {getTimeRemaining(order.tokenExpiresAt)}
                      </div>
                    </div>
                  )}

                  {/* Expired download */}
                  {order.status === "delivered" && !order.downloadAvailable && (
                    <div style={{ padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "12px", color: "#6A6A6A", textAlign: "center" }}>
                      Download link expired — contact support on Telegram
                    </div>
                  )}

                  {/* Pending */}
                  {order.status === "pending" && (
                    <div style={{ padding: "10px", background: "rgba(251,188,4,0.04)", border: "1px solid rgba(251,188,4,0.12)", borderRadius: "8px", fontSize: "12px", color: "#E8D9A8", textAlign: "center" }}>
                      Waiting for payment confirmation...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Help */}
        {!searched && (
          <div style={{ marginTop: "24px", padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "13px", color: "#6A6A6A", lineHeight: 1.7 }}>
            Enter the email you used at checkout to view your orders and download links.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", marginTop: "40px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center", fontSize: "12px", color: "#4A4A4A" }}>
          Need help?{" "}
          <a href="https://t.me/Selling_GAds" target="_blank" rel="noopener noreferrer" style={{ color: "#4285F4", textDecoration: "none" }}>
            Contact us on Telegram
          </a>
        </div>
      </footer>
    </div>
  );
}
