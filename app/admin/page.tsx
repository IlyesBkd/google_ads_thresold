"use client";

import React, { useState, useEffect, useCallback, CSSProperties } from "react";
import { api } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

type Page = "dashboard" | "products" | "inventory" | "orders" | "settings" | "logs" | "waitlist";
type OrderStatus = "pending" | "paid" | "delivered" | "failed" | "refunded";
type CredentialStatus = "available" | "reserved" | "sold" | "error";
type LogType = "import" | "sale" | "delivery" | "login" | "error" | "refund";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  thresholdValue: number;
  category: string;
  totalImported: number;
  sold: number;
  remaining: number;
  lowStockAlert: number;
  active: boolean;
}

interface Credential {
  id: string;
  email: string;
  password: string;
  productId: string;
  status: CredentialStatus;
  dateAdded: string;
  orderId: string | null;
}

interface Order {
  id: string;
  date: string;
  customer: string;
  productId: string;
  qty: number;
  amount: number;
  coin: string;
  status: OrderStatus;
  wallet: string;
  txHash: string;
  createdAt: string;
  paidAt: string;
  deliveredAt: string;
  deliveredCredentials: string[];
}

interface LogEntry {
  id: number;
  message: string;
  type: LogType;
  timestamp: string;
}

interface Admin {
  email: string;
  role: string;
}

interface WaitlistEntry {
  id: string;
  product_id: string;
  telegram_username: string;
  email: string | null;
  notified: boolean;
  notified_at: string | null;
  created_at: string;
}

// ─── Dashboard Stats Interface ──────────────────────────────────────────────

interface DashboardStats {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  sales30d: number;
  totalStock: number;
}

interface LogsData {
  logs: LogEntry[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const prefix = local.slice(0, 3);
  return `${prefix}***@${domain}`;
}

function maskCredential(email: string): string {
  return `${maskEmail(email)}:${"\\u2022".repeat(6)}`;
}

// ─── Style Constants ─────────────────────────────────────────────────────────

const COLORS = {
  bg: "#080808",
  card: "#0C0C0C",
  sidebar: "#0A0A0A",
  border: "rgba(255,255,255,0.08)",
  primary: "#4285F4",
  green: "#34A853",
  red: "#EA4335",
  yellow: "#FBBC04",
  text: "#FAFAFA",
  textSecondary: "#9A9A9A",
  textMuted: "#6A6A6A",
};

const statusColor: Record<OrderStatus, string> = {
  pending: COLORS.yellow,
  paid: COLORS.primary,
  delivered: COLORS.green,
  refunded: COLORS.textMuted,
  failed: COLORS.red,
};

const credentialStatusColor: Record<CredentialStatus, string> = {
  available: COLORS.green,
  reserved: COLORS.yellow,
  sold: COLORS.primary,
  error: COLORS.red,
};

const logTypeColor: Record<LogType, string> = {
  import: "#8E24AA",
  sale: COLORS.primary,
  delivery: COLORS.green,
  login: COLORS.textMuted,
  error: COLORS.red,
  refund: COLORS.yellow,
};

// ─── Components ──────────────────────────────────────────────────────────────

function BarsMark({ size = 24 }: { size?: number }) {
  const barW = size * 0.18;
  const gap = size * 0.12;
  const totalW = barW * 3 + gap * 2;
  const startX = (size - totalW) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <rect x={startX} y={size * 0.5} width={barW} height={size * 0.35} rx={barW / 2} fill="#4285F4" />
      <rect x={startX + barW + gap} y={size * 0.3} width={barW} height={size * 0.55} rx={barW / 2} fill="#4285F4" />
      <rect x={startX + (barW + gap) * 2} y={size * 0.15} width={barW} height={size * 0.7} rx={barW / 2} fill="#FBBC04" />
    </svg>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const style: CSSProperties = {
    position: "fixed",
    bottom: visible ? 32 : -60,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1A1A1A",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 24px",
    color: COLORS.text,
    fontFamily: "var(--font-inter)",
    fontSize: 14,
    zIndex: 9999,
    transition: "bottom 0.3s ease",
    whiteSpace: "nowrap",
  };
  return <div style={style}>{message}</div>;
}

// ─── Main Admin Component ────────────────────────────────────────────────────

export default function AdminPage() {
  // Auth state
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Navigation
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Drawers
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product form
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", thresholdValue: "350", category: "threshold", lowStockAlert: "5", active: true });

  // Inventory state
  const [inventoryFilter, setInventoryFilter] = useState<string>("all");
  const [importProduct, setImportProduct] = useState<string>("");
  const [importText, setImportText] = useState("");

  // Filters
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [logFilter, setLogFilter] = useState<string>("all");
  const [waitlistFilter, setWaitlistFilter] = useState<string>("all"); // all | pending | notified
  const [waitlistProductFilter, setWaitlistProductFilter] = useState<string>("all"); // all | 350 | 500

  // Reveal credentials state
  const [revealedCredentials, setRevealedCredentials] = useState<Record<string, boolean>>({});

  // Settings state
  const [settings, setSettings] = useState({
    wallet_btc: '',
    wallet_eth: '',
    wallet_usdt: '',
    min_alert_350: '5',
    min_alert_500: '5',
    download_validity_hours: '24',
    download_max_uses: '3',
    discord_webhook_url: '',
    telegram_username: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [discordTesting, setDiscordTesting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 2200);
  }, []);

  // ─── Data Loading Functions ─────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    const response = await api.getProducts();
    if (response.success && response.data) {
      const apiProducts = (response.data as any).products || response.data || [];
      // Map API data to component state format
      const mappedProducts: Product[] = apiProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        thresholdValue: p.threshold_value || p.thresholdValue,
        category: p.category,
        totalImported: p.total_imported || p.totalImported || 0,
        sold: p.sold || 0,
        remaining: p.remaining || 0,
        lowStockAlert: p.low_stock_alert || p.lowStockAlert || 5,
        active: p.active,
      }));
      setProducts(mappedProducts);
      // Set initial import product to first product if not set
      if (!importProduct && mappedProducts.length > 0) {
        setImportProduct(mappedProducts[0].id);
      }
    } else {
      showToast(response.error || 'Failed to load products');
    }
  }, [showToast, importProduct]);

  const loadInventory = useCallback(async () => {
    const response = await api.getInventory();
    if (response.success && response.data) {
      const apiCredentials = (response.data as any).credentials || response.data || [];
      const mappedCredentials: Credential[] = apiCredentials.map((c: any) => ({
        id: c.id,
        email: c.email,
        password: c.password || '',
        productId: c.product_id || c.productId,
        status: c.status,
        dateAdded: c.date_added || c.dateAdded || new Date(c.created_at).toLocaleDateString(),
        orderId: c.order_id || c.orderId || null,
      }));
      setCredentials(mappedCredentials);
    } else {
      showToast(response.error || 'Failed to load inventory');
    }
  }, [showToast]);

  const loadOrders = useCallback(async () => {
    const response = await api.getOrders();
    if (response.success && response.data) {
      const apiOrders = (response.data as any).orders || response.data || [];
      const mappedOrders: Order[] = apiOrders.map((o: any) => ({
        id: o.id,
        date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        customer: o.customer_email || o.customer,
        productId: o.product_id || o.productId,
        qty: o.quantity || o.qty,
        amount: o.amount / 100, // Convert cents to dollars
        coin: o.coin,
        status: o.status,
        wallet: o.wallet_address || o.wallet,
        txHash: o.tx_hash || o.txHash || '—',
        createdAt: new Date(o.created_at).toLocaleString(),
        paidAt: o.paid_at ? new Date(o.paid_at).toLocaleString() : '—',
        deliveredAt: o.delivered_at ? new Date(o.delivered_at).toLocaleString() : '—',
        deliveredCredentials: o.delivered_credentials || o.deliveredCredentials || [],
      }));
      setOrders(mappedOrders);
    } else {
      showToast(response.error || 'Failed to load orders');
    }
  }, [showToast]);

  const loadDashboard = useCallback(async () => {
    const response = await api.getDashboard();
    if (response.success && response.data) {
      const data = response.data as any;
      setDashboardStats({
        revenueToday: data.revenue_today || 0,
        revenueWeek: data.revenue_week || 0,
        revenueMonth: data.revenue_month || 0,
        sales30d: data.sales_30d || 0,
        totalStock: data.total_stock || 0,
      });
    } else {
      showToast(response.error || 'Failed to load dashboard');
    }
  }, [showToast]);

  const loadLogs = useCallback(async () => {
    const response = await api.getLogs();
    if (response.success && response.data) {
      const apiLogs = (response.data as any).logs || response.data || [];
      const mappedLogs: LogEntry[] = apiLogs.map((l: any) => ({
        id: l.id,
        message: l.message,
        type: l.type,
        timestamp: new Date(l.created_at || l.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }));
      setLogs(mappedLogs);
    } else {
      showToast(response.error || 'Failed to load logs');
    }
  }, [showToast]);

  const loadWaitlist = useCallback(async () => {
    const response = await fetch('/api/admin/waitlist');
    const data = await response.json();
    if (data.success) {
      setWaitlist(data.data || []);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const response = await fetch('/api/admin/settings');
    const data = await response.json();
    if (data.success && data.data) {
      setSettings({
        wallet_btc: data.data.wallet_btc || '',
        wallet_eth: data.data.wallet_eth || '',
        wallet_usdt: data.data.wallet_usdt || '',
        min_alert_350: data.data.min_alert_350 || '5',
        min_alert_500: data.data.min_alert_500 || '5',
        download_validity_hours: data.data.download_validity_hours || '24',
        download_max_uses: data.data.download_max_uses || '3',
        discord_webhook_url: data.data.discord_webhook_url || '',
        telegram_username: data.data.telegram_username || '',
      });
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const data = await response.json();
    setSettingsSaving(false);

    if (data.success) {
      showToast('Settings saved successfully');
    } else {
      showToast(data.error || 'Failed to save settings');
    }
  }, [settings, showToast]);

  const testDiscordWebhook = useCallback(async () => {
    if (!settings.discord_webhook_url) {
      showToast('Please enter a Discord webhook URL first');
      return;
    }

    setDiscordTesting(true);
    try {
      const response = await fetch('/api/admin/discord/test', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        showToast('✅ Test notification sent! Check your Discord channel');
      } else {
        showToast(`❌ ${data.error || 'Failed to send test notification'}`);
      }
    } catch (error) {
      showToast('❌ Network error');
    }
    setDiscordTesting(false);
  }, [settings.discord_webhook_url, showToast]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadProducts(),
      loadInventory(),
      loadOrders(),
      loadDashboard(),
      loadLogs(),
      loadSettings(),
      loadWaitlist(),
    ]);
    setLoading(false);
  }, [loadProducts, loadInventory, loadOrders, loadDashboard, loadLogs, loadSettings, loadWaitlist]);

  // ─── Login Handler ──────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoginError("");
    setLoading(true);
    const response = await api.login(email, password);
    setLoading(false);

    if (response.success && response.data) {
      const data = response.data as any;
      setLoggedIn(true);
      setAdminEmail(data.email || email);
      showToast("Logged in successfully");
    } else {
      setLoginError(response.error || "Invalid credentials");
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setAdminEmail("");
    setProducts([]);
    setCredentials([]);
    setOrders([]);
    setLogs([]);
    setDashboardStats(null);
    showToast("Logged out");
  };

  // ─── Load data when logged in ───────────────────────────────────────────

  useEffect(() => {
    if (loggedIn) {
      loadAllData();
    }
  }, [loggedIn, loadAllData]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProductDrawerOpen(false);
        setOrderDrawerOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Login Screen ────────────────────────────────────────────────────────

  if (!loggedIn) {
    const loginCard: CSSProperties = {
      position: "relative",
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: "48px 40px",
      width: "100%",
      maxWidth: 400,
      zIndex: 1,
    };
    const glowStyle: CSSProperties = {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 500,
      height: 500,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(66,133,244,0.12) 0%, transparent 70%)",
      pointerEvents: "none",
    };
    const inputStyle: CSSProperties = {
      width: "100%",
      padding: "12px 16px",
      background: "#111111",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      color: COLORS.text,
      fontSize: 14,
      fontFamily: "var(--font-inter)",
      outline: "none",
      marginTop: 6,
    };

    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter)" }}>
        <div style={glowStyle} />
        <div style={loginCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <BarsMark size={32} />
            <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, letterSpacing: 1.5 }}>THRESHOLDS</span>
          </div>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 32 }}>Admin panel. Sessions are JWT-based.</p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@thresholds.io"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
              style={inputStyle}
            />
          </div>
          {loginError && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(234,67,53,0.1)", border: `1px solid rgba(234,67,53,0.3)`, borderRadius: 8, fontSize: 13, color: COLORS.red }}>
              {loginError}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? COLORS.textMuted : COLORS.primary,
              border: "none",
              borderRadius: 11,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-inter)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Helper: get product name ───────────────────────────────────────────

  const getProductName = (productId: string): string => {
    const p = products.find((pr) => pr.id === productId);
    return p ? p.name : productId;
  };

  // ─── Navigation Items ────────────────────────────────────────────────────

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
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

  // ─── Page Titles ─────────────────────────────────────────────────────────

  const pageTitles: Record<Page, { eyebrow: string; title: string }> = {
    dashboard: { eyebrow: "Overview", title: "Dashboard" },
    products: { eyebrow: "Catalog", title: "Products" },
    inventory: { eyebrow: "Stock", title: "Inventory" },
    orders: { eyebrow: "Commerce", title: "Orders" },
    settings: { eyebrow: "System", title: "Settings" },
    logs: { eyebrow: "Activity", title: "Logs" },
    waitlist: { eyebrow: "Notifications", title: "Waitlist" },
  };

  // ─── Sidebar ─────────────────────────────────────────────────────────────

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

  const renderSidebar = () => (
    <aside style={sidebarStyle} id="admin-sidebar" data-open={sidebarOpen}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <BarsMark size={28} />
        <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: 1.2 }}>THRESHOLDS</span>
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => {
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => { setCurrentPage(item.page); setSidebarOpen(false); }}
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

      {/* User card */}
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
          onClick={handleLogout}
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

  // ─── Top Bar ─────────────────────────────────────────────────────────────

  const renderTopBar = () => (
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
        {/* Hamburger for mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
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
            {pageTitles[currentPage].eyebrow}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>
            {pageTitles[currentPage].title}
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

  // ─── Dashboard ───────────────────────────────────────────────────────────

  const renderDashboard = () => {
    if (loading || !dashboardStats) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Loading dashboard...</div>
        </div>
      );
    }

    const totalRemaining = dashboardStats.totalStock;
    const stats = [
      { label: "Revenue today", value: `$${(dashboardStats.revenueToday / 100).toFixed(0)}`, delta: "+12%", deltaColor: COLORS.green },
      { label: "Revenue this week", value: `$${(dashboardStats.revenueWeek / 100).toLocaleString()}`, delta: "+8%", deltaColor: COLORS.green },
      { label: "Revenue this month", value: `$${(dashboardStats.revenueMonth / 100).toLocaleString()}`, delta: "+23%", deltaColor: COLORS.green },
      { label: "Sales (30d)", value: String(dashboardStats.sales30d), delta: "+5", deltaColor: COLORS.green },
      { label: "Total stock remaining", value: String(totalRemaining), delta: "across all products", deltaColor: COLORS.textSecondary },
    ];

    const lowStockProducts = products.filter((p) => p.remaining <= p.lowStockAlert);
    const chartData = [320, 280, 410, 390, 450, 520, 480, 390, 550, 610, 580, 640, 590, 698];

    return (
      <div>
        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, fontFamily: "var(--font-mono)", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.deltaColor }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Low-stock alert banner */}
        {lowStockProducts.length > 0 && (
          <div style={{
            background: "rgba(251,188,4,0.06)",
            border: `1px solid rgba(251,188,4,0.2)`,
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 14, color: COLORS.yellow }}>
              {lowStockProducts.map((p) => `${p.name} has only ${p.remaining} accounts left (below threshold of ${p.lowStockAlert})`).join(" | ")}
            </span>
            <button
              onClick={() => setCurrentPage("inventory")}
              style={{
                padding: "6px 16px",
                background: "rgba(251,188,4,0.12)",
                border: `1px solid rgba(251,188,4,0.3)`,
                borderRadius: 8,
                color: COLORS.yellow,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
            >Restock</button>
          </div>
        )}

        {/* No low-stock: show paid orders awaiting delivery */}
        {lowStockProducts.length === 0 && orders.filter((o) => o.status === "paid").length > 0 && (
          <div style={{
            background: "rgba(66,133,244,0.06)",
            border: `1px solid rgba(66,133,244,0.2)`,
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 14, color: COLORS.primary }}>{orders.filter((o) => o.status === "paid").length} paid orders awaiting delivery</span>
            <button
              onClick={() => { setCurrentPage("orders"); setOrderFilter("paid"); }}
              style={{
                padding: "6px 16px",
                background: "rgba(66,133,244,0.12)",
                border: `1px solid rgba(66,133,244,0.3)`,
                borderRadius: 8,
                color: COLORS.primary,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
            >Review</button>
          </div>
        )}

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Revenue chart */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "22px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>Revenue 14d</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {chartData.map((v, i) => {
                const maxV = Math.max(...chartData);
                const h = (v / maxV) * 100;
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === chartData.length - 1 ? COLORS.primary : "rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    minWidth: 0,
                  }} />
                );
              })}
            </div>
          </div>

          {/* Stock breakdown */}
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
                    <div style={{ width: `${pct}%`, height: "100%", background: p.id === "PROD-350" ? COLORS.primary : COLORS.yellow, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest orders table */}
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
                <tr key={o.id} onClick={() => { setSelectedOrder(o); setOrderDrawerOpen(true); }} style={{ cursor: "pointer" }}>
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
  };

  // ─── Products ───────────────────────────────────────────────────────────

  const openProductDrawer = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price: String(product.price / 100), // Convert cents to dollars for display
        thresholdValue: String(product.thresholdValue),
        category: product.category,
        lowStockAlert: String(product.lowStockAlert),
        active: product.active
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: "", description: "", price: "", thresholdValue: "350", category: "threshold", lowStockAlert: "5", active: true });
    }
    setProductDrawerOpen(true);
  };

  const saveProduct = async () => {
    setLoading(true);
    if (editingProduct) {
      const response = await api.updateProduct(editingProduct.id, {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price) * 100, // Convert to cents
        threshold_value: Number(productForm.thresholdValue),
        category: productForm.category,
        low_stock_alert: Number(productForm.lowStockAlert),
        active: productForm.active,
      });
      if (response.success) {
        showToast("Product updated");
        await loadProducts();
      } else {
        showToast(response.error || "Failed to update product");
      }
    } else {
      const response = await api.createProduct({
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price) * 100, // Convert to cents
        threshold_value: Number(productForm.thresholdValue),
        category: productForm.category,
        low_stock_alert: Number(productForm.lowStockAlert),
      });
      if (response.success) {
        showToast("Product created");
        await loadProducts();
      } else {
        showToast(response.error || "Failed to create product");
      }
    }
    setLoading(false);
    setProductDrawerOpen(false);
  };

  const deleteProduct = async (id: string) => {
    setLoading(true);
    const response = await api.deleteProduct(id);
    if (response.success) {
      showToast("Product deleted");
      await loadProducts();
    } else {
      showToast(response.error || "Failed to delete product");
    }
    setLoading(false);
  };

  const toggleProductActive = async (productId: string, currentActive: boolean) => {
    setLoading(true);
    const response = await api.updateProduct(productId, { active: !currentActive });
    if (response.success) {
      showToast(currentActive ? "Product deactivated" : "Product activated");
      await loadProducts();
    } else {
      showToast(response.error || "Failed to update product");
    }
    setLoading(false);
  };

  const renderProducts = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, maxWidth: 500 }}>Manage threshold account products. Toggle availability, edit pricing, or create new offerings.</p>
        <button onClick={() => openProductDrawer()} style={{
          padding: "10px 20px",
          background: COLORS.primary,
          border: "none",
          borderRadius: 10,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-inter)",
        }}>New product</button>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Threshold", "Price", "Stock", "Active", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td style={{ padding: "14px 16px", fontSize: 13, color: COLORS.text }}>{product.name}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>${product.thresholdValue}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>${(product.price / 100).toFixed(2)}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: product.remaining <= product.lowStockAlert ? COLORS.red : COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>{product.remaining}</td>
                <td style={{ padding: "14px 16px" }}>
                  <button
                    onClick={() => toggleProductActive(product.id, product.active)}
                    disabled={loading}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      border: "none",
                      background: product.active ? COLORS.green : "rgba(255,255,255,0.1)",
                      position: "relative",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: product.active ? 21 : 3,
                      transition: "left 0.2s",
                    }} />
                  </button>
                </td>
                <td style={{ padding: "14px 16px", display: "flex", gap: 8 }}>
                  <button onClick={() => openProductDrawer(product)} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Edit</button>
                  <button onClick={() => deleteProduct(product.id)} style={{ padding: "6px 12px", background: "rgba(234,67,53,0.08)", border: `1px solid rgba(234,67,53,0.2)`, borderRadius: 8, color: COLORS.red, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Inventory ──────────────────────────────────────────────────────────

  const filteredCredentials = credentials.filter((c) => {
    if (inventoryFilter === "all") return true;
    return c.productId === inventoryFilter;
  });

  const inventoryCounts = {
    total: credentials.length,
    available: credentials.filter((c) => c.status === "available").length,
    sold: credentials.filter((c) => c.status === "sold").length,
    reserved: credentials.filter((c) => c.status === "reserved").length,
    error: credentials.filter((c) => c.status === "error").length,
  };

  const handleImport = async () => {
    const lines = importText.trim().split("\n").filter((l) => l.includes(":"));
    if (lines.length === 0) {
      showToast("No valid credentials found");
      return;
    }

    setLoading(true);
    const response = await api.importCredentials(importProduct, importText.trim());

    if (response.success && response.data) {
      const data = response.data as any;
      const { added, duplicates } = data;
      showToast(`${added} added, ${duplicates || 0} duplicates skipped`);
      setImportText("");
      await loadInventory();
      await loadProducts();
    } else {
      showToast(response.error || "Import failed");
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const renderInventory = () => {
    const filterTabs = [
      { label: "All", value: "all" },
      ...products.map(p => ({
        label: p.name.replace(" Account", ""),
        value: p.id
      }))
    ];

    return (
      <div>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setInventoryFilter(tab.value)}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${inventoryFilter === tab.value ? COLORS.primary : COLORS.border}`,
              background: inventoryFilter === tab.value ? "rgba(66,133,244,0.1)" : "transparent",
              color: inventoryFilter === tab.value ? COLORS.primary : COLORS.textSecondary,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-inter)",
              fontWeight: inventoryFilter === tab.value ? 500 : 400,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total imported", value: inventoryCounts.total, color: COLORS.text },
          { label: "Available", value: inventoryCounts.available, color: COLORS.green },
          { label: "Sold", value: inventoryCounts.sold, color: COLORS.primary },
          { label: "Reserved", value: inventoryCounts.reserved, color: COLORS.yellow },
          { label: "Error", value: inventoryCounts.error, color: COLORS.red },
        ].map((card, i) => (
          <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color, fontFamily: "var(--font-mono)" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Bulk import section */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "22px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>Bulk import credentials</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: "0 0 200px" }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, display: "block" }}>Import into product</label>
            <select
              value={importProduct}
              onChange={(e) => setImportProduct(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#111",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: COLORS.text,
                fontSize: 13,
                fontFamily: "var(--font-inter)",
                outline: "none",
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, display: "block" }}>Paste credentials (one email:password per line)</label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"example@gmail.com:password123\nanother@gmail.com:securepass"}
              style={{
                width: "100%",
                minHeight: 80,
                padding: "10px 14px",
                background: "#111",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: COLORS.text,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{
            padding: "10px 20px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            color: COLORS.textSecondary,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}>
            Upload .txt / .csv
            <input type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
          <button
            onClick={handleImport}
            disabled={loading || !importText.trim()}
            style={{
              padding: "10px 24px",
              background: (loading || !importText.trim()) ? COLORS.textMuted : COLORS.primary,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: (loading || !importText.trim()) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-inter)",
              opacity: (loading || !importText.trim()) ? 0.6 : 1,
            }}
          >{loading ? "Importing..." : "Import"}</button>
        </div>
      </div>

      {/* Stock table */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Credential", "Product", "Status", "Date added", "Order ID"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCredentials.map((cred) => (
              <tr key={cred.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.text, fontFamily: "var(--font-mono)" }}>
                  {maskEmail(cred.email)}:{"••••••"}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.textSecondary }}>{getProductName(cred.productId).replace(" Account", "")}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: credentialStatusColor[cred.status], background: `${credentialStatusColor[cred.status]}15`, padding: "3px 10px", borderRadius: 999 }}>{cred.status}</span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>{cred.dateAdded}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: cred.orderId ? COLORS.primary : COLORS.textMuted, fontFamily: "var(--font-mono)" }}>{cred.orderId || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  // ─── Orders ──────────────────────────────────────────────────────────────

  const filteredOrders = orders.filter((o) => {
    const matchFilter = orderFilter === "all" || o.status === orderFilter;
    const matchSearch = orderSearch === "" || o.customer.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, action?: string) => {
    setLoading(true);
    const response = await api.updateOrderStatus(orderId, newStatus, action);

    if (response.success) {
      showToast(`Order ${orderId} marked as ${newStatus}`);
      await loadOrders();
      // Update selected order if drawer is open
      const updatedOrder = orders.find(o => o.id === orderId);
      if (updatedOrder) {
        setSelectedOrder({ ...updatedOrder, status: newStatus });
      }
    } else {
      showToast(response.error || "Failed to update order");
    }
    setLoading(false);
  };

  const renderOrders = () => {
    const filterChips: { label: string; value: string }[] = [
      { label: "All", value: "all" },
      { label: "Pending", value: "pending" },
      { label: "Paid", value: "paid" },
      { label: "Delivered", value: "delivered" },
      { label: "Refunded", value: "refunded" },
      { label: "Failed", value: "failed" },
    ];

    return (
      <div>
        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Search orders..."
            style={{
              padding: "10px 16px",
              background: "#111",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              color: COLORS.text,
              fontSize: 13,
              fontFamily: "var(--font-inter)",
              outline: "none",
              width: 220,
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setOrderFilter(chip.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${orderFilter === chip.value ? COLORS.primary : COLORS.border}`,
                  background: orderFilter === chip.value ? "rgba(66,133,244,0.1)" : "transparent",
                  color: orderFilter === chip.value ? COLORS.primary : COLORS.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                }}
              >{chip.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Order ID", "Date", "Customer", "Product", "Qty", "Amount", "Coin", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => { setSelectedOrder(o); setOrderDrawerOpen(true); }}
                  style={{ cursor: "pointer", borderBottom: `1px solid ${COLORS.border}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>{o.id}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.textSecondary }}>{o.date}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.textSecondary }}>{o.customer}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.textSecondary }}>{getProductName(o.productId).replace(" Account", "")}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>{o.qty}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)" }}>${o.amount}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: COLORS.textSecondary, fontFamily: "var(--font-mono)" }}>{o.coin}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: statusColor[o.status], background: `${statusColor[o.status]}15`, padding: "3px 10px", borderRadius: 999 }}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Settings ────────────────────────────────────────────────────────────

  const renderSettings = () => {
    const inputStyle: CSSProperties = {
      width: "100%",
      padding: "10px 14px",
      background: "#111",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8,
      color: COLORS.text,
      fontSize: 13,
      fontFamily: "var(--font-mono)",
      outline: "none",
    };
    const labelStyle: CSSProperties = {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: "var(--font-mono)",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      display: "block",
    };
    const cardStyle: CSSProperties = {
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: "24px",
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Crypto wallets */}
          <div style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Crypto wallets</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { coin: "BTC", key: "wallet_btc", color: "#F7931A" },
                { coin: "ETH", key: "wallet_eth", color: "#627EEA" },
                { coin: "USDT", key: "wallet_usdt", color: "#26A17B" },
              ].map((w) => (
                <div key={w.coin}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: w.color, background: `${w.color}20`, padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-mono)" }}>{w.coin}</span>
                  </div>
                  <input
                    value={settings[w.key as keyof typeof settings]}
                    onChange={(e) => setSettings({ ...settings, [w.key]: e.target.value })}
                    style={inputStyle}
                    placeholder={`Enter ${w.coin} wallet address`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stock & Delivery */}
          <div style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Stock & delivery</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Low-stock alert ($350 account)</label>
                <input
                  value={settings.min_alert_350}
                  onChange={(e) => setSettings({ ...settings, min_alert_350: e.target.value })}
                  style={inputStyle}
                  type="number"
                />
              </div>
              <div>
                <label style={labelStyle}>Low-stock alert ($500 account)</label>
                <input
                  value={settings.min_alert_500}
                  onChange={(e) => setSettings({ ...settings, min_alert_500: e.target.value })}
                  style={inputStyle}
                  type="number"
                />
              </div>
              <div>
                <label style={labelStyle}>Download link validity (hours)</label>
                <input
                  value={settings.download_validity_hours}
                  onChange={(e) => setSettings({ ...settings, download_validity_hours: e.target.value })}
                  style={inputStyle}
                  type="number"
                />
              </div>
              <div>
                <label style={labelStyle}>Max download uses</label>
                <input
                  value={settings.download_max_uses}
                  onChange={(e) => setSettings({ ...settings, download_max_uses: e.target.value })}
                  style={inputStyle}
                  type="number"
                />
              </div>
            </div>
          </div>

        {/* Team */}
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Team</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 13, color: COLORS.text }}>{adminEmail}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                color: COLORS.primary,
                background: "rgba(66,133,244,0.12)",
                padding: "2px 10px",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
              }}>Admin</span>
            </div>
            <button
              onClick={() => showToast("Team management coming soon")}
              style={{
                padding: "10px",
                background: "transparent",
                border: `1px dashed ${COLORS.border}`,
                borderRadius: 10,
                color: COLORS.textMuted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
            >+ Add admin</button>
          </div>
        </div>

        {/* Integrations */}
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 20 }}>Integrations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Telegram username</label>
              <input
                value={settings.telegram_username}
                onChange={(e) => setSettings({ ...settings, telegram_username: e.target.value })}
                style={inputStyle}
                placeholder="@your_telegram_username"
              />
            </div>
            <div>
              <label style={labelStyle}>Discord webhook (stock alerts)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={settings.discord_webhook_url}
                  onChange={(e) => setSettings({ ...settings, discord_webhook_url: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button
                  onClick={testDiscordWebhook}
                  disabled={discordTesting || !settings.discord_webhook_url}
                  style={{
                    padding: "0 16px",
                    background: discordTesting || !settings.discord_webhook_url ? COLORS.border : "#5865F2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: discordTesting || !settings.discord_webhook_url ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-inter)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {discordTesting ? "Testing..." : "Test"}
                </button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                Get notified for sales, low stock, and errors
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            style={{
              padding: "12px 32px",
              background: settingsSaving ? COLORS.textMuted : COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: settingsSaving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-inter)",
              transition: "background 0.2s",
            }}
          >
            {settingsSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    );
  };

  // ─── Logs ────────────────────────────────────────────────────────────────

  const filteredLogs = logs.filter((l) => logFilter === "all" || l.type === logFilter);

  const renderLogs = () => {
    const filterChips: { label: string; value: string }[] = [
      { label: "All", value: "all" },
      { label: "Import", value: "import" },
      { label: "Sale", value: "sale" },
      { label: "Delivery", value: "delivery" },
      { label: "Refund", value: "refund" },
      { label: "Login", value: "login" },
      { label: "Error", value: "error" },
    ];

    return (
      <div>
        {/* Filters + Export */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setLogFilter(chip.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${logFilter === chip.value ? COLORS.primary : COLORS.border}`,
                  background: logFilter === chip.value ? "rgba(66,133,244,0.1)" : "transparent",
                  color: logFilter === chip.value ? COLORS.primary : COLORS.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                }}
              >{chip.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => showToast("Sales CSV exported")} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Export sales CSV</button>
            <button onClick={() => showToast("Logs CSV exported")} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-inter)" }}>Export logs CSV</button>
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "16px 0" }}>
          {filteredLogs.map((log, i) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 22px",
                borderBottom: i < filteredLogs.length - 1 ? `1px solid ${COLORS.border}` : "none",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: logTypeColor[log.type], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{log.message}</div>
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                color: logTypeColor[log.type],
                background: `${logTypeColor[log.type]}15`,
                padding: "2px 10px",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                flexShrink: 0,
              }}>{log.type}</span>
              <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", flexShrink: 0 }}>{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Drawers ─────────────────────────────────────────────────────────────

  const drawerOverlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    animation: "fadeIn 0.2s ease",
  };

  const drawerStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    right: 0,
    width: 420,
    maxWidth: "90vw",
    height: "100vh",
    background: COLORS.card,
    borderLeft: `1px solid ${COLORS.border}`,
    zIndex: 201,
    padding: "28px",
    overflowY: "auto",
    animation: "slideInRight 0.25s ease",
    fontFamily: "var(--font-inter)",
  };

  const drawerInputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "#111",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: "var(--font-inter)",
    outline: "none",
    marginTop: 6,
  };

  const renderProductDrawer = () => {
    if (!productDrawerOpen) return null;
    return (
      <>
        <div style={drawerOverlayStyle} onClick={() => setProductDrawerOpen(false)} />
        <div style={drawerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, margin: 0 }}>{editingProduct ? "Edit product" : "New product"}</h3>
            <button onClick={() => setProductDrawerOpen(false)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 20 }}>x</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Name</label>
              <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={drawerInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Description</label>
              <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ ...drawerInputStyle, minHeight: 80, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Price ($)</label>
                <input value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={drawerInputStyle} type="number" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Threshold value ($)</label>
                <select value={productForm.thresholdValue} onChange={(e) => setProductForm({ ...productForm, thresholdValue: e.target.value })} style={{ ...drawerInputStyle, fontFamily: "var(--font-inter)" }}>
                  <option value="350">$350</option>
                  <option value="500">$500</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Category</label>
              <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={{ ...drawerInputStyle, fontFamily: "var(--font-inter)" }}>
                <option value="threshold">Threshold</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Low-stock alert threshold</label>
              <input value={productForm.lowStockAlert} onChange={(e) => setProductForm({ ...productForm, lowStockAlert: e.target.value })} style={drawerInputStyle} type="number" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Active</label>
              <button
                onClick={() => setProductForm({ ...productForm, active: !productForm.active })}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  border: "none",
                  background: productForm.active ? COLORS.green : "rgba(255,255,255,0.1)",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 3,
                  left: productForm.active ? 21 : 3,
                  transition: "left 0.2s",
                }} />
              </button>
            </div>
            <button
              onClick={saveProduct}
              disabled={loading}
              style={{
                padding: "12px",
                background: loading ? COLORS.textMuted : COLORS.primary,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 8,
                opacity: loading ? 0.6 : 1,
              }}
            >{loading ? "Saving..." : (editingProduct ? "Save changes" : "Create product")}</button>
          </div>
        </div>
      </>
    );
  };

  const renderOrderDrawer = () => {
    if (!orderDrawerOpen || !selectedOrder) return null;
    const o = orders.find((ord) => ord.id === selectedOrder.id) || selectedOrder;

    const infoRow = (label: string, value: string) => (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
        <span style={{ fontSize: 13, color: COLORS.text, fontFamily: "var(--font-mono)", maxWidth: 240, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
      </div>
    );

    const actionBtn = (label: string, color: string, action: () => void) => (
      <button
        onClick={action}
        disabled={loading}
        style={{
          padding: "8px 16px",
          background: `${color}12`,
          border: `1px solid ${color}30`,
          borderRadius: 8,
          color: color,
          fontSize: 12,
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "var(--font-inter)",
          opacity: loading ? 0.6 : 1,
        }}
      >{label}</button>
    );

    const isRevealed = revealedCredentials[o.id] || false;

    return (
      <>
        <div style={drawerOverlayStyle} onClick={() => setOrderDrawerOpen(false)} />
        <div style={drawerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, marginBottom: 4 }}>{o.id}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, margin: 0 }}>Order details</h3>
                <span style={{ fontSize: 11, fontWeight: 500, color: statusColor[o.status], background: `${statusColor[o.status]}15`, padding: "3px 10px", borderRadius: 999 }}>{o.status}</span>
              </div>
            </div>
            <button onClick={() => setOrderDrawerOpen(false)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 20 }}>x</button>
          </div>

          <div style={{ marginBottom: 28 }}>
            {infoRow("Customer", o.customer)}
            {infoRow("Product", getProductName(o.productId))}
            {infoRow("Quantity", String(o.qty))}
            {infoRow("Amount", `$${o.amount} ${o.coin}`)}
            {infoRow("Wallet", o.wallet.slice(0, 20) + "...")}
            {infoRow("Tx hash", o.txHash)}
            {infoRow("Created", o.createdAt)}
            {infoRow("Paid", o.paidAt)}
            {infoRow("Delivered", o.deliveredAt)}
          </div>

          {/* Delivered credentials section */}
          {o.deliveredCredentials.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Delivered credentials</div>
                <button
                  onClick={() => setRevealedCredentials({ ...revealedCredentials, [o.id]: !isRevealed })}
                  style={{
                    padding: "4px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    color: COLORS.textSecondary,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "var(--font-inter)",
                  }}
                >{isRevealed ? "Hide" : "Reveal"}</button>
              </div>
              <div style={{ background: "#111", borderRadius: 8, padding: "12px 14px", border: `1px solid ${COLORS.border}` }}>
                {o.deliveredCredentials.map((cred, i) => {
                  const [em, pw] = cred.split(":");
                  return (
                    <div key={i} style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: COLORS.text, padding: "4px 0", borderBottom: i < o.deliveredCredentials.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                      {isRevealed ? cred : `${maskEmail(em || "")}:${"\\u2022".repeat(6)}`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Actions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {actionBtn("Mark delivered", COLORS.green, () => updateOrderStatus(o.id, "delivered"))}
            {actionBtn("Mark paid", COLORS.primary, () => updateOrderStatus(o.id, "paid"))}
            {actionBtn("Re-deliver (.txt)", "#8E24AA", () => showToast("Credentials .txt re-sent"))}
            {actionBtn("Refund", COLORS.yellow, () => updateOrderStatus(o.id, "refunded"))}
            {actionBtn("Cancel", COLORS.red, () => updateOrderStatus(o.id, "failed"))}
          </div>
        </div>
      </>
    );
  };

  // ─── Render Waitlist ─────────────────────────────────────────────────────

  const renderWaitlist = () => {
    // Filter waitlist entries
    const filteredWaitlist = waitlist.filter((entry) => {
      // Filter by status
      if (waitlistFilter === "pending" && entry.notified) return false;
      if (waitlistFilter === "notified" && !entry.notified) return false;

      // Filter by product
      if (waitlistProductFilter !== "all" && entry.product_id !== waitlistProductFilter) return false;

      return true;
    });

    // Group by product for stats
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
        loadWaitlist();
      } else {
        showToast(data.error || 'Failed to notify users');
      }
    };

    const handleDeleteEntry = async (id: string) => {
      if (!confirm('Delete this waitlist entry?')) return;

      const response = await fetch(`/api/admin/waitlist?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        showToast('Entry deleted');
        loadWaitlist();
      } else {
        showToast(data.error || 'Failed to delete entry');
      }
    };

    return (
      <div>
        {/* Stats Cards */}
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

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select value={waitlistFilter} onChange={(e) => setWaitlistFilter(e.target.value)} style={{ padding: "8px 12px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="notified">Notified Only</option>
          </select>
          <select value={waitlistProductFilter} onChange={(e) => setWaitlistProductFilter(e.target.value)} style={{ padding: "8px 12px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
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

        {/* Waitlist Table */}
        {filteredWaitlist.length === 0 ? (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>No waitlist entries</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>
              {waitlistFilter !== "all" || waitlistProductFilter !== "all"
                ? "Try adjusting your filters"
                : "Customers will appear here when they sign up for stock notifications"}
            </div>
          </div>
        ) : (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "15%" }}>Product</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "20%" }}>Telegram</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "20%" }}>Email</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "15%" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "15%" }}>Signed Up</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, width: "15%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWaitlist.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 600, color: COLORS.text }}>
                          {entry.product_id === "350" ? "$350" : "$500"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: COLORS.primary }}>
                          {entry.telegram_username}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                          {entry.email || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {entry.notified ? (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "rgba(52,168,83,0.1)", color: COLORS.green }}>
                            ✓ Notified
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "rgba(251,188,4,0.1)", color: COLORS.yellow }}>
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          style={{
                            padding: "6px 12px",
                            background: "none",
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 6,
                            color: COLORS.red,
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit"
                          }}
                        >
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
  };

  // ─── Page Router ─────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return renderDashboard();
      case "products": return renderProducts();
      case "inventory": return renderInventory();
      case "orders": return renderOrders();
      case "settings": return renderSettings();
      case "logs": return renderLogs();
      case "waitlist": return renderWaitlist();
    }
  };

  // ─── Main Layout ─────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "var(--font-inter)" }}>
      {/* CSS keyframes via style tag */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 900px) {
          #admin-sidebar { transform: translateX(-100%); }
          #admin-sidebar[data-open="true"] { transform: translateX(0) !important; }
          [data-hamburger] { display: block !important; }
          [data-main-content] { margin-left: 0 !important; }
          [data-mobile-overlay] { display: block !important; }
        }
      `}</style>

      {renderSidebar()}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          data-mobile-overlay=""
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99, display: "none" }}
        />
      )}

      {/* Main content */}
      <div data-main-content="" style={{ marginLeft: 248, minHeight: "100vh" }}>
        {renderTopBar()}
        <main style={{ maxWidth: 1180, padding: 28 }}>
          {renderPage()}
        </main>
      </div>

      {/* Drawers */}
      {renderProductDrawer()}
      {renderOrderDrawer()}

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
