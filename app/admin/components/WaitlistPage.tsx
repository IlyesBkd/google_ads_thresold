"use client";

import { COLORS, WaitlistEntry } from "./types";

interface WaitlistPageProps {
  waitlist: WaitlistEntry[];
  waitlistFilter: string;
  waitlistProductFilter: string;
  onFilterChange: (filter: string) => void;
  onProductFilterChange: (filter: string) => void;
  showToast: (msg: string) => void;
  onReload: () => void;
}

export default function WaitlistPage({
  waitlist,
  waitlistFilter,
  waitlistProductFilter,
  onFilterChange,
  onProductFilterChange,
  showToast,
  onReload,
}: WaitlistPageProps) {
  const filteredWaitlist = waitlist.filter((entry) => {
    if (waitlistFilter === "pending" && entry.notified) return false;
    if (waitlistFilter === "notified" && !entry.notified) return false;
    if (waitlistProductFilter !== "all" && entry.product_id !== waitlistProductFilter) return false;
    return true;
  });

  const statsByProduct = waitlist.reduce((acc, entry) => {
    if (!acc[entry.product_id]) {
      acc[entry.product_id] = { total: 0, pending: 0, notified: 0 };
    }
    acc[entry.product_id].total++;
    if (entry.notified) {
      acc[entry.product_id].notified++;
    } else {
      acc[entry.product_id].pending++;
    }
    return acc;
  }, {} as Record<string, { total: number; pending: number; notified: number }>);

  const totalPending = Object.values(statsByProduct).reduce((sum, s) => sum + s.pending, 0);
  const totalNotified = Object.values(statsByProduct).reduce((sum, s) => sum + s.notified, 0);

  const handleNotifyAll = async (productId: string) => {
    if (!confirm(`Notify all pending users for product ${productId}?`)) return;
    const response = await fetch('/api/admin/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    const data = await response.json();
    if (data.success) {
      showToast(`${data.data.count} users notified`);
      onReload();
    } else {
      showToast(data.error || 'Failed to notify users');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this waitlist entry?')) return;
    const response = await fetch(`/api/admin/waitlist?id=${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      showToast('Entry deleted');
      onReload();
    } else {
      showToast(data.error || 'Failed to delete entry');
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>Total Pending</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.yellow }}>{totalPending}</div>
        </div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>Total Notified</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.green }}>{totalNotified}</div>
        </div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>$350 Pending</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.primary }}>{statsByProduct["350"]?.pending || 0}</div>
        </div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>$500 Pending</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.primary }}>{statsByProduct["500"]?.pending || 0}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={waitlistFilter} onChange={(e) => onFilterChange(e.target.value)} style={{ padding: "8px 12px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">All Status</option>
          <option value="pending">Pending Only</option>
          <option value="notified">Notified Only</option>
        </select>
        <select value={waitlistProductFilter} onChange={(e) => onProductFilterChange(e.target.value)} style={{ padding: "8px 12px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">All Products</option>
          <option value="350">$350 Account</option>
          <option value="500">$500 Account</option>
        </select>
        <div style={{ flex: 1 }} />
        {statsByProduct["350"]?.pending > 0 && (
          <button onClick={() => handleNotifyAll("350")} style={{ padding: "8px 16px", background: COLORS.primary, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Notify All $350 ({statsByProduct["350"].pending})
          </button>
        )}
        {statsByProduct["500"]?.pending > 0 && (
          <button onClick={() => handleNotifyAll("500")} style={{ padding: "8px 16px", background: COLORS.primary, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Notify All $500 ({statsByProduct["500"].pending})
          </button>
        )}
      </div>

      {filteredWaitlist.length === 0 ? (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>No waitlist entries</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>
            {waitlistFilter !== "all" || waitlistProductFilter !== "all" ? "Try adjusting your filters" : "Customers will appear here when they sign up for stock notifications"}
          </div>
        </div>
      ) : (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Product</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Telegram</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Signed Up</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 600, color: COLORS.text }}>{entry.product_id === "350" ? "$350" : "$500"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: COLORS.primary }}>{entry.telegram_username}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{entry.email || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {entry.notified ? (
                        <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "rgba(52,168,83,0.1)", color: COLORS.green }}>✓ Notified</span>
                      ) : (
                        <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "rgba(251,188,4,0.1)", color: COLORS.yellow }}>⏳ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date(entry.created_at).toLocaleDateString()}</span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button onClick={() => handleDeleteEntry(entry.id)} style={{ padding: "6px 12px", background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, fontSize: 13, color: COLORS.textMuted }}>
        Showing {filteredWaitlist.length} of {waitlist.length} entries
      </div>
    </div>
  );
}
