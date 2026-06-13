"use client";

import { COLORS, DashboardStats, Product, Order, statusColor } from "./types";

interface DashboardPageProps {
  loading: boolean;
  stats: DashboardStats | null;
  products: Product[];
  orders: Order[];
  onNavigateInventory: () => void;
  onNavigateOrders: () => void;
  onSelectOrder: (order: Order) => void;
  getProductName: (id: string) => string;
}

export default function DashboardPage({
  loading,
  stats,
  products,
  orders,
  onNavigateInventory,
  onNavigateOrders,
  onSelectOrder,
  getProductName,
}: DashboardPageProps) {
  if (loading || !stats) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: "Revenue today", value: `$${(stats.revenueToday / 100).toFixed(0)}`, delta: "", deltaColor: COLORS.textSecondary },
    { label: "Revenue this week", value: `$${(stats.revenueWeek / 100).toLocaleString()}`, delta: "", deltaColor: COLORS.textSecondary },
    { label: "Revenue this month", value: `$${(stats.revenueMonth / 100).toLocaleString()}`, delta: "", deltaColor: COLORS.textSecondary },
    { label: "Sales (30d)", value: String(stats.sales30d), delta: "", deltaColor: COLORS.textSecondary },
    { label: "Total stock remaining", value: String(stats.totalStock), delta: "across all products", deltaColor: COLORS.textSecondary },
  ];

  const lowStockProducts = products.filter((p) => p.remaining <= p.lowStockAlert);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, fontFamily: "var(--font-mono)", marginBottom: 4 }}>{s.value}</div>
            {s.delta && <div style={{ fontSize: 12, color: s.deltaColor }}>{s.delta}</div>}
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div style={{ background: "rgba(251,188,4,0.06)", border: "1px solid rgba(251,188,4,0.2)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: COLORS.yellow }}>
            {lowStockProducts.map((p) => `${p.name} has only ${p.remaining} accounts left`).join(" | ")}
          </span>
          <button onClick={onNavigateInventory} style={{ padding: "6px 16px", background: "rgba(251,188,4,0.12)", border: "1px solid rgba(251,188,4,0.3)", borderRadius: 8, color: COLORS.yellow, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-inter)" }}>
            Restock
          </button>
        </div>
      )}

      {lowStockProducts.length === 0 && orders.filter((o) => o.status === "paid").length > 0 && (
        <div style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: COLORS.primary }}>{orders.filter((o) => o.status === "paid").length} paid orders awaiting delivery</span>
          <button onClick={onNavigateOrders} style={{ padding: "6px 16px", background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.3)", borderRadius: 8, color: COLORS.primary, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-inter)" }}>
            Review
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "22px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>Revenue this month</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: COLORS.text, fontFamily: "var(--font-mono)" }}>
              ${(stats.revenueMonth / 100).toLocaleString()}
            </span>
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "22px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 20 }}>Stock breakdown</div>
          {products.map((p) => {
            const pct = p.totalImported > 0 ? Math.round((p.remaining / p.totalImported) * 100) : 0;
            return (
              <div key={p.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: COLORS.text }}>{p.name.replace(" Account", "")}</span>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>{p.remaining}/{p.totalImported}</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct <= 30 ? COLORS.yellow : COLORS.primary, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "22px" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>Latest orders</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Order", "Date", "Product", "Qty", "Amount", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map((o) => (
              <tr key={o.id} onClick={() => onSelectOrder(o)} style={{ cursor: "pointer" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>{o.id}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.textSecondary }}>{o.date}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.textSecondary }}>{getProductName(o.productId).replace(" Account", "")}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>{o.qty}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>${o.amount}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: statusColor[o.status], background: `${statusColor[o.status]}15`, padding: "3px 10px", borderRadius: 999 }}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
