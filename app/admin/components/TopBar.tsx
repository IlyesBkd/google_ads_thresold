"use client";

import { COLORS, Page } from "./types";

const PAGE_TITLES: Record<Page, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: "Overview", title: "Dashboard" },
  products: { eyebrow: "Catalog", title: "Products" },
  inventory: { eyebrow: "Stock", title: "Inventory" },
  orders: { eyebrow: "Commerce", title: "Orders" },
  settings: { eyebrow: "System", title: "Settings" },
  logs: { eyebrow: "Activity", title: "Logs" },
  waitlist: { eyebrow: "Notifications", title: "Waitlist" },
};

interface TopBarProps {
  currentPage: Page;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function TopBar({ currentPage, sidebarOpen, onToggleSidebar }: TopBarProps) {
  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: COLORS.bg,
      borderBottom: `1px solid ${COLORS.border}`,
      padding: "16px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          data-hamburger=""
          style={{
            display: "none",
            background: "transparent",
            border: "none",
            color: COLORS.text,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
            {PAGE_TITLES[currentPage].eyebrow}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>
            {PAGE_TITLES[currentPage].title}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS.green,
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>Live</span>
      </div>
    </header>
  );
}
