# 📡 API Endpoints Documentation

**Projet:** ADSCALE Store  
**Date:** 2026-06-11  
**Version:** 1.0

---

## 🔐 Admin APIs (Authentication Required)

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Login admin avec email/password |
| POST | `/api/admin/auth/logout` | Logout admin (clear JWT) |
| GET | `/api/admin/auth/me` | Get current admin info |

---

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Stats: revenue, sales, stock |

**Response:**
```json
{
  "success": true,
  "data": {
    "revenueToday": 2000,
    "revenueWeek": 5000,
    "revenueMonth": 15000,
    "sales30d": 45,
    "totalStock": 120
  }
}
```

---

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/products` | List all products |
| POST | `/api/admin/products` | Create new product |
| PATCH | `/api/admin/products` | Update product |
| DELETE | `/api/admin/products` | Delete product |

---

### Inventory (Stock Management)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/inventory?productId=350&status=available` | List credentials |
| POST | `/api/admin/inventory` | Import bulk credentials |

---

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/orders?status=paid&limit=50` | List orders |
| PATCH | `/api/admin/orders` | Update order status |
| POST | `/api/admin/orders/deliver` | Manual delivery |

---

### Logs (Audit Trail)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/logs?type=sale&limit=100` | Get activity logs |

---

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings` | Get all settings (wallets, thresholds, etc.) |
| POST | `/api/admin/settings` | Update settings |

**Settings Keys:**
- `wallet_btc`, `wallet_eth`, `wallet_usdt`
- `min_alert_350`, `min_alert_500`
- `download_validity_hours`, `download_max_uses`
- `discord_webhook_url`, `telegram_username`

---

### Waitlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/waitlist` | List all waitlist entries |
| POST | `/api/admin/waitlist` | Mark as notified (by IDs or productId) |
| DELETE | `/api/admin/waitlist?id=xxx` | Delete entry |

**POST Body:**
```json
// Option A: Notify specific IDs
{ "ids": ["uuid1", "uuid2"] }

// Option B: Notify all for a product
{ "productId": "350" }
```

---

## 🌍 Public APIs (No Auth Required)

### Stock

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/stock` | Get available stock per product |

**Response:**
```json
{
  "success": true,
  "data": {
    "350": 23,
    "500": 15
  }
}
```

---

### Settings (Public Subset)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/settings` | Get public settings (telegram username only) |

**Response:**
```json
{
  "success": true,
  "data": {
    "telegram_username": "@adscale_support"
  }
}
```

---

### Waitlist (Customer Signup)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/waitlist` | Customer signs up for stock notification |
| GET | `/api/waitlist?productId=350` | Get waitlist count (public) |

**POST Body:**
```json
{
  "productId": "350",
  "telegramUsername": "@john_doe",
  "email": "john@example.com" // optional
}
```

---

### Orders (Customer Lookup)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/by-email?email=customer@example.com` | Get orders by email |

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "customer@example.com",
    "totalOrders": 2,
    "orders": [
      {
        "id": "order-id",
        "productName": "$350 Threshold Account",
        "quantity": 1,
        "amount": 18900,
        "coin": "BTC",
        "status": "delivered",
        "downloadAvailable": true,
        "downloadToken": "token-abc",
        "tokenExpiresAt": "2026-06-12T10:00:00Z",
        "tokenUsesLeft": 2
      }
    ]
  }
}
```

---

## 💰 Crypto Payment APIs

### Create Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crypto/create-payment` | Create crypto payment order |

**Body:**
```json
{
  "productId": "350",
  "quantity": 1,
  "customerEmail": "customer@example.com",
  "coin": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "payAddress": "bc1q...",
    "payAmount": 0.00196348,
    "expiresAt": "2026-06-11T11:00:00Z",
    "mockMode": false
  }
}
```

---

### Webhook (NOWPayments)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crypto/webhook` | Receive payment confirmation from NOWPayments |

**Headers Required:**
- `x-nowpayments-sig` (signature verification)

---

## 📥 Download APIs

### Download Token

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/download/[token]` | Download credentials .txt file |

**Returns:** `.txt` file with account credentials

**Validation:**
- Token must be valid
- Token not expired
- Uses < max_uses

---

## 📊 API Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## 🔧 Development

### Local Testing

```bash
# Start dev server
npm run dev

# Test API with curl
curl http://localhost:3000/api/public/stock

# Test admin API (need JWT token)
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/admin/dashboard
```

---

### Adding New Endpoints

**1. Create route file:**
```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: { /* your data */ }
  });
}
```

**2. Add to api-client (if admin):**
```typescript
// lib/api-client.ts
async yourEndpoint() {
  return this.request('/your-endpoint');
}
```

**3. Use in frontend:**
```typescript
const response = await api.yourEndpoint();
if (response.success) {
  // Use response.data
}
```

---

## 🚀 Production URLs

Replace `localhost:3000` with your production domain:

```
https://your-domain.com/api/...
```

---

## 📝 Notes

- All admin APIs require JWT authentication (cookie or Bearer token)
- Public APIs have no auth but may have rate limiting
- Payment APIs use signature verification for security
- Download tokens expire after 24h by default (configurable)

---

**Last Updated:** 2026-06-11  
**Maintained By:** Dev Team
