# 💳 Payment Integration Guide (NOWPayments Mock)

## Overview

The payment system is **100% functional** with a mock NOWPayments API for development. It simulates the complete payment workflow without requiring real crypto or API keys.

---

## 🔄 Complete Workflow

```
1. Customer clicks "Buy Now" on homepage
        ↓
2. Checkout modal opens (CheckoutModal.tsx)
        ↓
3. Customer enters email + selects coin (BTC/ETH/USDT)
        ↓
4. Frontend → POST /api/crypto/create-payment
        ↓
5. Backend creates order (status=pending)
        ↓
6. Backend calls NOWPayments (or mock)
        ↓
7. Mock generates fake payment address + amount
        ↓
8. Customer sees payment details (address, amount, timer 30min)
        ↓
9. [MOCK MODE] After 10 seconds, auto-trigger webhook
        ↓
10. Webhook → POST /api/crypto/webhook
        ↓
11. Verify signature (mock always valid)
        ↓
12. Update order (status: pending → paid, paid_at: NOW)
        ↓
13. Call deliverOrder(orderId) automatically
        ↓
14. Assign credentials from stock (status: available → sold)
        ↓
15. Generate download token (24h, 3 uses)
        ↓
16. Send email with download link
        ↓
17. Customer receives email → clicks link
        ↓
18. Downloads credentials.txt
        ↓
19. Done! 🎉
```

---

## 🎭 Mock Mode (Current)

### How It Works

When `CRYPTO_GATEWAY_API_KEY` is not set or equals `"your-crypto-gateway-api-key"`, the system runs in **mock mode**.

**Mock behavior:**
- ✅ Generates fake payment addresses (valid format)
- ✅ Calculates crypto amounts using mock rates:
  - BTC: $95,000 per coin
  - ETH: $3,500 per coin
  - USDT: 1:1 with USD
- ✅ Auto-confirms payment after **10 seconds**
- ✅ Triggers webhook automatically
- ✅ Complete end-to-end flow works

**What doesn't happen:**
- ❌ No real blockchain transaction
- ❌ No real API call to NOWPayments
- ❌ No signature verification (always passes)

### Testing in Mock Mode

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Go to homepage:** `http://localhost:3000`

3. **Click "Buy Now"** on either product

4. **Enter your email** (any email works)

5. **Select crypto** (BTC, ETH, or USDT)

6. **Click "Continue to payment"**

7. **Modal shows payment details:**
   - Payment address (fake but valid format)
   - Amount to send (calculated with mock rate)
   - Timer (30min countdown)
   - Yellow banner: "🎭 MOCK MODE: Payment will be auto-confirmed in 10 seconds"

8. **Wait 10 seconds** (watch console logs)

9. **Webhook fires automatically** → order paid → credentials delivered → email sent

10. **Check your email** for download link (if Resend configured)

11. **Or check console** for download URL

12. **Visit download URL** → click Download

13. **Get credentials.txt file**

---

## 🔄 Switch to Real NOWPayments

### Step 1: Get API Key

1. Sign up at [nowpayments.io](https://nowpayments.io)
2. Verify your email
3. Go to **Settings** → **API keys**
4. Generate a new API key
5. Copy it

### Step 2: Configure Environment

Edit `.env.local`:

```bash
# Replace with your real key
CRYPTO_GATEWAY_API_KEY=your_real_nowpayments_api_key_here

# Webhook secret (for signature verification)
CRYPTO_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Configure Webhook URL in NOWPayments

1. Go to NOWPayments dashboard → **Settings** → **IPN/Webhooks**
2. Add your webhook URL:
   ```
   https://yourdomain.com/api/crypto/webhook
   ```
3. For local dev testing, use **ngrok**:
   ```bash
   ngrok http 3000
   # Copy the https URL, e.g., https://abc123.ngrok.io
   # Webhook URL: https://abc123.ngrok.io/api/crypto/webhook
   ```

### Step 4: Test with Real Payment

1. Restart dev server (to reload env vars):
   ```bash
   npm run dev
   ```

2. Go through checkout flow

3. Modal **won't** show "MOCK MODE" banner

4. Send **real crypto** to the address shown

5. Wait for blockchain confirmation (5-30 min depending on coin)

6. NOWPayments calls your webhook

7. Order delivered automatically

---

## 🔐 Webhook Security

### Signature Verification

The webhook verifies NOWPayments signature to ensure requests are authentic.

**Algorithm:** HMAC-SHA512

```typescript
const crypto = require('crypto');
const secret = process.env.CRYPTO_WEBHOOK_SECRET;
const hmac = crypto.createHmac('sha512', secret);
hmac.update(rawPayload);
const expectedSignature = hmac.digest('hex');

if (signature !== expectedSignature) {
  return 401 Unauthorized;
}
```

**Header:** `x-nowpayments-sig`

**In mock mode:** signature check always passes.

---

## 📊 Payment Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `waiting` | Payment not yet detected | Do nothing, customer still paying |
| `confirming` | Transaction detected, waiting for confirmations | Do nothing, wait for `finished` |
| `sending` | Payment being processed | Do nothing |
| `confirmed` | Payment confirmed by blockchain | **Deliver order** |
| `finished` | Payment complete | **Deliver order** |
| `failed` | Payment failed | Mark order as failed, don't deliver |
| `expired` | Timer ran out | Mark order as failed |

---

## 🧪 Testing Checklist

### Mock Mode Tests

- [ ] Customer can enter email + select coin
- [ ] Payment address displays correctly
- [ ] Timer shows 30min countdown
- [ ] Mock banner shows "auto-confirmed in 10s"
- [ ] After 10s, webhook fires (check console)
- [ ] Order status changes: pending → paid → delivered
- [ ] Email sent (if Resend configured)
- [ ] Download link works
- [ ] Credentials.txt downloads
- [ ] File contains correct credentials

### Real NOWPayments Tests

- [ ] API key configured in `.env.local`
- [ ] Webhook URL configured in NOWPayments dashboard
- [ ] ngrok running (for local testing)
- [ ] No mock banner shows in checkout
- [ ] Real crypto sent to address
- [ ] Webhook received (check `/api/crypto/webhook` logs)
- [ ] Order delivered after confirmation
- [ ] Email received

---

## 🔍 Debugging

### Check Webhook Logs

```bash
# Console logs when webhook fires
📥 Webhook received: { payment_id, order_id, payment_status, ... }
💳 Payment status: finished for order ORD-123
✅ Order ORD-123 marked as paid
📤 Triggering automatic delivery for ORD-123...
✅ Order ORD-123 delivered successfully
   Credentials: 1
   Token: abc123...
```

### Check Database

```sql
-- Check order status
SELECT id, status, paid_at, delivered_at FROM orders WHERE id = 'ORD-123';

-- Check if credentials were assigned
SELECT * FROM stock_items WHERE order_id = 'ORD-123';

-- Check webhook logs
SELECT * FROM logs WHERE order_id = 'ORD-123' ORDER BY created_at DESC;
```

### Common Issues

**Issue:** Webhook not firing (real mode)

**Solutions:**
- Verify webhook URL in NOWPayments dashboard
- Check ngrok is running (for local dev)
- Check firewall isn't blocking ngrok
- Check NOWPayments logs for webhook errors

**Issue:** Signature verification fails

**Solutions:**
- Verify `CRYPTO_WEBHOOK_SECRET` matches NOWPayments
- Check raw payload isn't being modified (JSON parsing)
- Ensure HMAC uses SHA512 (not SHA256)

**Issue:** Payment confirmed but no delivery

**Solutions:**
- Check webhook logs for errors
- Check stock availability (may be out of stock)
- Check email logs (email may have failed but order still delivered)
- Manually trigger delivery from admin panel

---

## 📈 Going to Production

### Checklist

- [ ] Real NOWPayments API key in production env vars
- [ ] Webhook secret configured
- [ ] Webhook URL pointing to production domain (HTTPS)
- [ ] Test with small real payment first ($1-5)
- [ ] Monitor webhook logs for 24h
- [ ] Set up Discord alerts for failed deliveries
- [ ] Document payout addresses (where crypto is received)
- [ ] Set up monitoring for stock levels

### Environment Variables (Production)

```bash
CRYPTO_GATEWAY_API_KEY=your_real_key
CRYPTO_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
EMAIL_API_KEY=re_your_resend_key
EMAIL_FROM=noreply@yourdomain.com
```

---

## 💰 Receiving Payouts

NOWPayments automatically forwards payments to your configured payout addresses.

**Configure in NOWPayments dashboard:**
1. Settings → Payout addresses
2. Add your BTC/ETH/USDT wallet addresses
3. Choose auto-payout threshold (min balance)
4. Choose payout frequency (daily, weekly, manual)

**Recommended:**
- Auto-payout: Daily
- Min threshold: $100
- Keep some balance in NOWPayments to cover small refunds

---

## 🔄 Refunds

If you need to refund an order:

1. Go to NOWPayments dashboard
2. Find the payment by `payment_id` or `order_id`
3. Click "Refund" (if within 7 days)
4. In your admin panel:
   - Go to Orders → find the order
   - Click "Refund" action
   - This marks order as refunded and logs it

**Note:** NOWPayments charges a small fee for refunds (~1%)

---

## 📞 Support

- **NOWPayments docs:** https://documenter.getpostman.com/view/7907941/S1a32n38
- **NOWPayments support:** support@nowpayments.io
- **Webhook issues:** Check "IPN History" in NOWPayments dashboard

---

## 🎯 Current Status

| Feature | Status |
|---------|--------|
| Mock payment | ✅ 100% functional |
| Real payment | ✅ Ready (needs API key) |
| Auto-delivery | ✅ 100% functional |
| Webhook | ✅ 100% functional |
| Signature verification | ✅ Implemented |
| Timer/Expiry | ✅ 30min countdown |
| Multi-coin | ✅ BTC, ETH, USDT |
| Email on delivery | ✅ Resend integration |

**You can go live TODAY** by just adding your NOWPayments API key!
