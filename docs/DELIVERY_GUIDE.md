# 📬 Delivery System Guide

## Overview

The ADSCALE delivery system automatically handles credential assignment, download token generation, and email delivery when an order is marked as paid.

---

## 🔄 Workflow

```
Customer pays (crypto) → Webhook confirms payment → Order status = "paid"
                                ↓
                     Admin clicks "Deliver" OR
                     Auto-delivery (when webhook integrated)
                                ↓
                ┌───────────────────────────────┐
                │   deliverOrder() function     │
                └───────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────┐
        │ 1. Check order is "paid"              │
        │ 2. Check available stock              │
        │ 3. Assign credentials (status=sold)   │
        │ 4. Update order (status=delivered)    │
        │ 5. Generate download token (24h)      │
        │ 6. Send email with download link      │
        │ 7. Log delivery action                │
        └───────────────────────────────────────┘
                                ↓
        Customer receives email with download link
                                ↓
        Customer visits /download/[token]
                                ↓
        Downloads credentials.txt file
```

---

## 📧 Email Configuration

### Setup Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use onboarding domain for testing)
3. Generate API key
4. Add to `.env.local`:

```bash
EMAIL_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### Test Email Locally

```bash
# Create a test order and trigger delivery
npm run test:delivery
```

This will:
- Create a test order (status=paid)
- Trigger delivery
- Attempt to send email (will fail if EMAIL_API_KEY not set)
- Generate download token
- Print download URL

---

## 🔑 Download Tokens

Download tokens are generated automatically and stored in the `download_tokens` table.

### Token Properties

| Property | Default | Configured via |
|----------|---------|----------------|
| **Expiry** | 24 hours | `DOWNLOAD_LINK_VALIDITY_HOURS` in `.env.local` |
| **Max uses** | 3 downloads | `DOWNLOAD_LINK_MAX_USES` in `.env.local` |
| **Format** | 64-char hex | Auto-generated with `crypto.randomBytes(32)` |

### Download URL Format

```
https://yourdomain.com/download/[token]
```

Example:
```
https://adscale.io/download/a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## 📄 Credentials File Format

The downloaded `.txt` file contains:

```
╔═══════════════════════════════════════════════════════════════════════╗
║                          ADSCALE                                      ║
║                  Google Ads Threshold Accounts                        ║
╚═══════════════════════════════════════════════════════════════════════╝

ORDER ID: ORD-1234
PRODUCT: $350 Threshold Account
DELIVERED: 2026-06-11T10:30:00.000Z
QUANTITY: 2

═══════════════════════════════════════════════════════════════════════

ACCOUNT 1:
───────────────────────────────────────────────────────────────────────
Email:    googleads.user001@gmail.com
Password: Thr3sh0ld!2024


ACCOUNT 2:
───────────────────────────────────────────────────────────────────────
Email:    threshold.acc88@gmail.com
Password: Ads!Thresh88x

═══════════════════════════════════════════════════════════════════════

IMPORTANT INSTRUCTIONS:
[... security, login, warranty, support info ...]
```

---

## 🛠️ Manual Delivery (Admin Panel)

### Via Admin UI

1. Go to `/admin` → Orders
2. Click on an order with status "Paid"
3. In the detail drawer, click **"Mark delivered"**
4. System automatically:
   - Assigns available credentials
   - Generates download token
   - Sends email to customer
   - Updates order status
   - Logs the action

### Via API

```bash
POST /api/admin/orders/deliver
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "orderId": "ORD-1234"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "deliveredCount": 2,
    "downloadToken": "a1b2c3d4..."
  }
}
```

---

## 🧪 Testing

### 1. Test with Script

```bash
npm run test:delivery
```

This creates a test order and delivers it automatically.

### 2. Test Manually

```bash
# 1. Import credentials (via admin or SQL)
INSERT INTO stock_items (product_id, email, password, status)
VALUES ('PROD-350', 'test@example.com', 'TestPass123', 'available');

# 2. Create an order
INSERT INTO orders (id, product_id, quantity, customer_email, amount, coin, status, created_at, paid_at)
VALUES ('ORD-TEST-001', 'PROD-350', 1, 'buyer@example.com', 18900, 'BTC', 'paid', NOW(), NOW());

# 3. Deliver via admin panel or API
curl -X POST http://localhost:3000/api/admin/orders/deliver \
  -H "Cookie: admin_token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-TEST-001"}'
```

### 3. Test Download Page

Visit the download URL from the delivery response:
```
http://localhost:3000/download/[token]
```

You should see a clean UI with a download button.

---

## 🔍 Troubleshooting

### Email not sending

**Symptom:** Delivery succeeds but customer doesn't receive email

**Check:**
```bash
# 1. Verify EMAIL_API_KEY is set
echo $EMAIL_API_KEY

# 2. Check logs table
SELECT * FROM logs WHERE type = 'error' AND message LIKE '%Email%' ORDER BY created_at DESC;

# 3. Check Resend dashboard for failed sends
```

**Solution:**
- Make sure `EMAIL_API_KEY` is valid in `.env.local`
- Verify domain is verified in Resend
- Check spam folder

### Download link expired

**Symptom:** Customer clicks link but gets "Download link has expired"

**Check:**
```sql
SELECT token, expires_at, uses_count, max_uses
FROM download_tokens
WHERE token = 'YOUR_TOKEN';
```

**Solution:**
- Regenerate token manually:
```sql
UPDATE download_tokens
SET expires_at = NOW() + INTERVAL '24 hours', uses_count = 0
WHERE token = 'YOUR_TOKEN';
```

### Insufficient stock

**Symptom:** Delivery fails with "Insufficient stock" error

**Check:**
```sql
SELECT status, COUNT(*) as count
FROM stock_items
WHERE product_id = 'PROD-350'
GROUP BY status;
```

**Solution:**
- Import more credentials via admin panel (Inventory → Bulk import)

### Credentials not assigned

**Symptom:** Order shows "delivered" but stock_items still show status="available"

**Check:**
```sql
SELECT * FROM stock_items WHERE order_id = 'YOUR_ORDER_ID';
```

**Solution:**
- This indicates the delivery transaction failed midway
- Manually update:
```sql
UPDATE stock_items
SET status = 'sold', order_id = 'YOUR_ORDER_ID'
WHERE id IN (
  SELECT id FROM stock_items
  WHERE product_id = 'PROD_ID' AND status = 'available'
  LIMIT X
);
```

---

## 📊 Monitoring

### Check delivery success rate

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE type = 'delivery') as deliveries,
  COUNT(*) FILTER (WHERE type = 'error' AND message LIKE '%delivery%') as errors
FROM logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Check download token usage

```sql
SELECT
  order_id,
  expires_at,
  uses_count,
  max_uses,
  CASE
    WHEN expires_at < NOW() THEN 'expired'
    WHEN uses_count >= max_uses THEN 'exhausted'
    ELSE 'active'
  END as status
FROM download_tokens
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚀 Production Checklist

Before going live, ensure:

- [ ] `EMAIL_API_KEY` is set with a valid Resend key
- [ ] `EMAIL_FROM` is set to a verified domain email
- [ ] `DOWNLOAD_LINK_VALIDITY_HOURS` is configured (default 24)
- [ ] `DOWNLOAD_LINK_MAX_USES` is configured (default 3)
- [ ] Test delivery end-to-end with a real email
- [ ] Verify credentials.txt downloads correctly
- [ ] Check spam folder to ensure emails aren't filtered
- [ ] Set up Discord webhook for delivery notifications (optional)
- [ ] Monitor logs table for errors

---

## 📞 Support

If you encounter issues:
1. Check the `logs` table for error messages
2. Review this guide's troubleshooting section
3. Contact support with your order ID and error details
