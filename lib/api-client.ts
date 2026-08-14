/**
 * Client-side API helper for admin panel
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl = '/api/admin';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Include cookies
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async me() {
    return this.request('/auth/me');
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard() {
    return this.request('/dashboard');
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  async getProducts() {
    return this.request('/products');
  }

  async createProduct(data: {
    name: string;
    description: string;
    price: number;
    threshold_value: number;
    category: string;
    low_stock_alert: number;
  }) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      threshold_value: number;
      category: string;
      low_stock_alert: number;
      active: boolean;
    }>
  ) {
    return this.request('/products', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...data }),
    });
  }

  async deleteProduct(id: string) {
    return this.request('/products', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async getInventory(params?: {
    productId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/inventory${queryString}`);
  }

  async importCredentials(productId: string, credentials: string, googleAdsCreatedAt?: string) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify({ productId, credentials, googleAdsCreatedAt }),
    });
  }

  async deleteCredentials(ids: string[]) {
    return this.request('/inventory', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  async moveCredentials(ids: string[], productId: string) {
    return this.request('/inventory', {
      method: 'PATCH',
      body: JSON.stringify({ ids, productId }),
    });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params?: {
    status?: string;
    customerEmail?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/orders${queryString}`);
  }

  async updateOrderStatus(orderId: string, status: string, action?: string) {
    return this.request('/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId, status, action }),
    });
  }

  async deliverOrder(orderId: string) {
    return this.request('/orders/deliver', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async reissueDownloadLink(orderId: string) {
    return this.request('/orders/reissue', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(days = 30) {
    return this.request(`/analytics?days=${days}`);
  }

  // ─── Google Sheets ────────────────────────────────────────────────────────

  async getSheetsStatus() {
    return this.request('/sheets');
  }

  async runSheetsAction(action: string) {
    return this.request('/sheets', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ─── Logs ─────────────────────────────────────────────────────────────────

  async getLogs(params?: { type?: string; limit?: number; offset?: number }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/logs${queryString}`);
  }
}

export const api = new ApiClient();
