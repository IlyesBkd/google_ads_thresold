"use client";

import React, { CSSProperties } from "react";
import { COLORS, Page } from "./types";

function BarsMark({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="GADSCALE" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }} />
  );
}

const NAV_ITEMS: { page: Page; label: string; icon: React.ReactNode }[] = [
  {
    page: "dashboard", label: "Dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    page: "products", label: "Products",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 5l-6-3L3 5v2l6 3 6-3V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 7v4l6 3 6-3V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
  {
    page: "inventory", label: "Inventory",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.5"/><path d="M2 3a1 1 0 011-1h12a1 1 0 011 1v2H2V3z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    page: "orders", label: "Orders",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4l2-2h10l2 2v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    page: "settings", label: "Settings",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="6" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="9" r="1.5" fill="currentColor"/><circle cx="8" cy="13" r="1.5" fill="currentColor"/></svg>,
  },
  {
    page: "logs", label: "Logs",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9h2l2-4 3 8 2-6 2 3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    page: "waitlist", label: "Waitlist",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1v4M9 13v4M1 9h4M13 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  adminEmail: string;
  sidebarOpen: boolean;
  onLogout: () => void;
}

export default function Sidebar({ currentPage, onNavigate, adminEmail, sidebarOpen, onLogout }: SidebarProps) {
  const sidebarStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: 248,
    height: "100vh",
    background: COLORS.sidebar,
    borderRight: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    transition: "transform 0.25s ease",
    fontFamily: "var(--font-inter)",
  };

  return (
    <aside style={sidebarStyle} id="admin-sidebar" data-open={sidebarOpen}>
      <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <BarsMark size={28} />
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.primary,
          background: "rgba(66,133,244,0.12)",
          padding: "2px 8px",
          borderRadius: 999,
          fontFamily: "var(--font-mono)",
          letterSpacing: 0.5,
        }}>ADMIN</span>
      </div>

      <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                border: "none",
                borderLeft: active ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                background: active ? "rgba(66,133,244,0.08)" : "transparent",
                borderRadius: 8,
                color: active ? COLORS.text : COLORS.textSecondary,
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontFamily: "var(--font-inter)",
                transition: "background 0.15s",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(66,133,244,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.primary,
            fontFamily: "var(--font-mono)",
          }}>{adminEmail.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{adminEmail}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Admin</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.textSecondary,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
