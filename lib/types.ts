/**
 * Database types matching PostgreSQL schema
 */

export type StockStatus = 'available' | 'reserved' | 'sold' | 'error';
export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'failed' | 'refunded';
export type AdminRole = 'owner' | 'manager' | 'support';
export type LogType = 'import' | 'sale' | 'delivery' | 'login' | 'error' | 'refund';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // In cents
  threshold_value: number;
  category: string;
  low_stock_alert: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StockItem {
  id: string;
  product_id: string;
  email: string;
  password: string;
  totp_secret: string | null;
  recovery_email: string | null;
  proxy: string | null;
  status: StockStatus;
  order_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  product_id: string;
  quantity: number;
  customer_email: string;
  amount: number; // In cents
  coin: string;
  status: OrderStatus;
  wallet_address: string | null;
  tx_hash: string | null;
  created_at: Date;
  paid_at: Date | null;
  delivered_at: Date | null;
  updated_at: Date;
}

export interface DownloadToken {
  id: string;
  order_id: string;
  token: string;
  expires_at: Date;
  max_uses: number;
  uses_count: number;
  created_at: Date;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  created_at: Date;
  updated_at: Date;
}

export interface Log {
  id: string;
  type: LogType;
  message: string;
  admin_id: string | null;
  order_id: string | null;
  created_at: Date;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductWithStock extends Product {
  stock_total: number;
  stock_available: number;
  stock_sold: number;
  stock_reserved: number;
  stock_error: number;
}

export interface OrderWithDetails extends Order {
  product_name: string;
  delivered_credentials?: string[];
}

export interface StockItemWithProduct extends StockItem {
  product_name: string;
}

export interface DashboardStats {
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  sales_30d: number;
  total_stock: number;
  low_stock_products: Array<{
    product_id: string;
    product_name: string;
    remaining: number;
    alert_threshold: number;
  }>;
}
