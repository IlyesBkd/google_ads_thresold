"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrderCard from "@/components/OrderCard";

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

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("adscale_customer_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
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
        setLoading(false);
        return;
      }

      setOrders(data.data.orders);
      setLoading(false);

      // Save email to localStorage
      localStorage.setItem("adscale_customer_email", email);
    } catch (err: any) {
      setError(err.message || "Network error");
      setOrders([]);
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#F5F5F5",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1040px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#F5F5F5",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ color: "#4285F4" }}>←</span>
            ADSCALE
          </Link>
          <Link
            href="/"
            style={{
              fontSize: "14px",
              color: "#9A9A9A",
              textDecoration: "none",
            }}
          >
            Back to Shop
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "clamp(32px, 6vw, 80px) 24px",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              marginBottom: "12px",
            }}
          >
            Your Orders
          </h1>
          <p style={{ fontSize: "15px", color: "#9A9A9A", lineHeight: 1.6 }}>
            Enter your email to view order history and download links
          </p>
        </div>

        {/* Search Form */}
        <div
          style={{
            background: "#0E0E0E",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "28px",
            marginBottom: "32px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "13px",
              color: "#9A9A9A",
              marginBottom: "10px",
            }}
          >
            Email Address
          </label>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="you@example.com"
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px 16px",
                background: "#080808",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#F5F5F5",
                fontSize: "15px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !email}
              style={{
                padding: "14px 28px",
                background: loading || !email ? "#2a5a9a" : "#4285F4",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading || !email ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Searching..." : "View Orders"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 14px",
                background: "rgba(234,67,53,0.08)",
                border: "1px solid rgba(234,67,53,0.2)",
                borderRadius: "8px",
                color: "#EA4335",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {searched && !loading && (
          <>
            {orders.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  background: "#0C0C0C",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#F5F5F5",
                    marginBottom: "8px",
                  }}
                >
                  No orders found
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#9A9A9A",
                    lineHeight: 1.6,
                    maxWidth: "400px",
                    margin: "0 auto",
                  }}
                >
                  We couldn't find any orders for {email}. Make sure you're using
                  the email address you used at checkout.
                </p>
                <Link
                  href="/"
                  style={{
                    display: "inline-flex",
                    marginTop: "24px",
                    padding: "12px 24px",
                    background: "#4285F4",
                    color: "#fff",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: "20px",
                    fontSize: "14px",
                    color: "#9A9A9A",
                  }}
                >
                  Found {orders.length} order{orders.length > 1 ? "s" : ""} for{" "}
                  <strong style={{ color: "#F5F5F5" }}>{email}</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Info Box */}
        {!searched && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px 24px",
              background: "rgba(66,133,244,0.06)",
              border: "1px solid rgba(66,133,244,0.16)",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#4285F4",
                marginBottom: "8px",
              }}
            >
              💡 What you can do here
            </div>
            <ul
              style={{
                fontSize: "13px",
                color: "#C8C8C8",
                lineHeight: 1.7,
                paddingLeft: "20px",
                margin: 0,
              }}
            >
              <li>View all your past orders</li>
              <li>Check order status (pending, paid, delivered)</li>
              <li>Re-download account credentials (if token valid)</li>
              <li>See download expiration and usage limits</li>
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "24px",
          marginTop: "80px",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
            fontSize: "13px",
            color: "#6A6A6A",
          }}
        >
          Need help? Contact us via{" "}
          <a
            href="https://t.me/adscale_support"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4285F4", textDecoration: "none" }}
          >
            Telegram
          </a>
        </div>
      </footer>
    </div>
  );
}
