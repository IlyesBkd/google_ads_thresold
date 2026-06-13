import { CSSProperties } from "react";

export type Page = "dashboard" | "products" | "inventory" | "orders" | "settings" | "logs" | "waitlist";
export type OrderStatus = "pending" | "paid" | "delivered" | "failed" | "refunded";
export type CredentialStatus = "available" | "reserved" | "sold" | "error";
export type LogType = "import" | "sale" | "delivery" | "login" | "error" | "refund";

export interface Product {
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

export interface Credential {
  id: string;
  email: string;
  password: string;
  productId: string;
  status: CredentialStatus;
  dateAdded: string;
  orderId: string | null;
}

export interface Order {
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

export interface LogEntry {
  id: number;
  message: string;
  type: LogType;
  timestamp: string;
}

export interface DashboardStats {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  sales30d: number;
  totalStock: number;
}

export interface WaitlistEntry {
  id: string;
  product_id: string;
  telegram_username: string;
  email: string | null;
  notified: boolean;
  notified_at: string | null;
  created_at: string;
}

export const COLORS = {
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

export const statusColor: Record<OrderStatus, string> = {
  pending: COLORS.yellow,
  paid: COLORS.primary,
  delivered: COLORS.green,
  refunded: COLORS.textMuted,
  failed: COLORS.red,
};

export const credentialStatusColor: Record<CredentialStatus, string> = {
  available: COLORS.green,
  reserved: COLORS.yellow,
  sold: COLORS.primary,
  error: COLORS.red,
};

export const logTypeColor: Record<LogType, string> = {
  import: "#8E24AA",
  sale: COLORS.primary,
  delivery: COLORS.green,
  login: COLORS.textMuted,
  error: COLORS.red,
  refund: COLORS.yellow,
};

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const prefix = local.slice(0, 3);
  return `${prefix}***@${domain}`;
}
