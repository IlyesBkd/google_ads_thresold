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

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; color: string; label: string; icon: string }
> = {
  pending: {
    bg: "rgba(251,188,4,0.08)",
    border: "rgba(251,188,4,0.25)",
    color: "#FBBC04",
    label: "Payment Pending",
    icon: "⏳",
  },
  paid: {
    bg: "rgba(66,133,244,0.08)",
    border: "rgba(66,133,244,0.25)",
    color: "#4285F4",
    label: "Payment Confirmed",
    icon: "✓",
  },
  delivered: {
    bg: "rgba(52,168,83,0.1)",
    border: "rgba(52,168,83,0.25)",
    color: "#34A853",
    label: "Delivered",
    icon: "✅",
  },
  failed: {
    bg: "rgba(234,67,53,0.08)",
    border: "rgba(234,67,53,0.25)",
    color: "#EA4335",
    label: "Failed",
    icon: "✗",
  },
  refunded: {
    bg: "rgba(158,158,158,0.1)",
    border: "rgba(158,158,158,0.25)",
    color: "#9E9E9E",
    label: "Refunded",
    icon: "↩",
  },
};

export default function OrderCard({ order }: { order: Order }) {
  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    return `${hours}h left`;
  };

  return (
    <div
      style={{
        background: "#0C0C0C",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#F5F5F5",
              marginBottom: "6px",
            }}
          >
            {order.productName}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono), monospace",
              color: "#6A6A6A",
            }}
          >
            Order #{order.id.substring(0, 8).toUpperCase()}
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: statusStyle.color,
            whiteSpace: "nowrap",
          }}
        >
          <span>{statusStyle.icon}</span>
          {statusStyle.label}
        </div>
      </div>

      {/* Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          padding: "16px 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", color: "#6A6A6A", marginBottom: "4px" }}>
            Quantity
          </div>
          <div style={{ fontSize: "14px", color: "#F5F5F5", fontWeight: 600 }}>
            {order.quantity}× accounts
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#6A6A6A", marginBottom: "4px" }}>
            Total Paid
          </div>
          <div style={{ fontSize: "14px", color: "#F5F5F5", fontWeight: 600 }}>
            ${(order.amount / 100).toFixed(2)} ({order.coin})
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#6A6A6A", marginBottom: "4px" }}>
            Order Date
          </div>
          <div style={{ fontSize: "13px", color: "#C8C8C8" }}>
            {formatDate(order.createdAt)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#6A6A6A", marginBottom: "4px" }}>
            {order.status === "delivered" ? "Delivered" : "Updated"}
          </div>
          <div style={{ fontSize: "13px", color: "#C8C8C8" }}>
            {formatDate(order.deliveredAt || order.paidAt)}
          </div>
        </div>
      </div>

      {/* Download Section */}
      {order.status === "delivered" && (
        <div>
          {order.downloadAvailable && order.downloadToken ? (
            <>
              <Link
                href={`/download/${order.downloadToken}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px",
                  background: "#4285F4",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#3367D6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#4285F4";
                }}
              >
                <span>⬇</span>
                Download Account Credentials
              </Link>

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  color: "#6A6A6A",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <span>
                  {order.tokenUsesLeft !== null && order.tokenUsesLeft > 0
                    ? `${order.tokenUsesLeft} download${order.tokenUsesLeft > 1 ? "s" : ""} left`
                    : "No downloads left"}
                </span>
                <span>•</span>
                <span>{getTimeRemaining(order.tokenExpiresAt)}</span>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "12px",
                background: "rgba(234,67,53,0.08)",
                border: "1px solid rgba(234,67,53,0.2)",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#EA4335",
                textAlign: "center",
              }}
            >
              Download link expired or used up
            </div>
          )}
        </div>
      )}

      {order.status === "pending" && (
        <div
          style={{
            padding: "12px",
            background: "rgba(251,188,4,0.06)",
            border: "1px solid rgba(251,188,4,0.18)",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#E8D9A8",
            textAlign: "center",
          }}
        >
          Waiting for payment confirmation...
        </div>
      )}

      {order.status === "failed" && (
        <div
          style={{
            padding: "12px",
            background: "rgba(234,67,53,0.08)",
            border: "1px solid rgba(234,67,53,0.2)",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#F28B82",
            textAlign: "center",
          }}
        >
          Payment expired or failed. Please try again.
        </div>
      )}
    </div>
  );
}
