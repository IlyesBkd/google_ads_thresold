# 📋 TODO Final - ADSCALE Store

**Date:** 2026-06-11  
**Statut:** Liste complète des tâches à faire avant production

---

## 🔴 CRITIQUE - À faire AVANT déploiement

### 1. Configuration Base de Données

```bash
# 1. Se connecter à la base de données de production
# (Neon, Supabase, ou autre PostgreSQL)

# 2. Exécuter les migrations
npm run db:migrate

# 3. Vérifier que toutes les tables sont créées
psql $DATABASE_URL -c "\dt"
# Expected: products, stock_items, orders, download_tokens, admins, logs, settings, waitlist

# 4. Créer le premier admin
psql $DATABASE_URL -c "
  INSERT INTO admins (email, password_hash, role)
  VALUES ('votre@email.com', '\$2b\$10\$HASH_ICI', 'owner');
"
# Note: Générer hash avec bcrypt, ou utiliser l'API de création admin
```

---

### 2. Variables d'Environnement (.env.local)

**Créer/Compléter `.env.local` avec VOS VRAIES valeurs :**

```bash
# ═══ DATABASE ═══
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# ═══ JWT ═══
JWT_SECRET="votre-cle-secrete-super-longue-et-aleatoire-256-bits-minimum"

# ═══ CRYPTO WALLETS (VOS VRAIES ADRESSES) ═══
NEXT_PUBLIC_WALLET_BTC="bc1q_VOTRE_VRAIE_ADRESSE_BITCOIN"
NEXT_PUBLIC_WALLET_ETH="0x_VOTRE_VRAIE_ADRESSE_ETHEREUM"
NEXT_PUBLIC_WALLET_USDT="T_VOTRE_VRAIE_ADRESSE_USDT_TRC20"

# ═══ NOWPAYMENTS (si vous utilisez NOWPayments) ═══
NOWPAYMENTS_API_KEY="votre_cle_api_nowpayments"
NOWPAYMENTS_IPN_SECRET="votre_secret_ipn"
NEXT_PUBLIC_NOWPAYMENTS_ENABLED="true"  # ou "false" pour mock mode

# ═══ TELEGRAM BOT (pour notifications waitlist) ═══
TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"  # De @BotFather

# ═══ SITE URL ═══
NEXT_PUBLIC_SITE_URL="https://votre-domaine.com"

# ═══ EMAIL (si vous ajoutez email delivery) ═══
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="votre@email.com"
SMTP_PASSWORD="votre_mot_de_passe_app"
```

**⚠️ IMPORTANT:** Ne JAMAIS commit `.env.local` dans Git !

---

### 3. Configuration des Wallets dans l'Admin

```
1. Déployer le site
2. Aller sur https://votre-site.com/admin
3. Login avec compte admin créé
4. Aller dans Settings
5. Entrer VOS VRAIES adresses wallet:
   - BTC: bc1q... (Bech32 recommandé)
   - ETH: 0x...
   - USDT: T... (TRC20) ou 0x... (ERC20)
6. Configurer seuils d'alerte stock
7. Save
```

---

### 4. Importer le Stock Initial

**Préparer fichier CSV ou TXT:**

```csv
email,password
account1@gmail.com,Password123!
account2@gmail.com,SecurePass456
account3@gmail.com,MyPass789
```

**Importer via Admin:**

```
1. Aller dans Inventory
2. Sélectionner produit: $350 ou $500
3. Copier/coller liste ou upload fichier
4. Import
5. Vérifier: X accounts imported
```

**Ou via SQL direct:**

```sql
INSERT INTO stock_items (product_id, email, password, status)
VALUES
  ('350', 'account1@gmail.com', 'Password123!', 'available'),
  ('350', 'account2@gmail.com', 'SecurePass456', 'available'),
  ('500', 'account3@gmail.com', 'MyPass789', 'available');
```

---

### 5. Configurer Telegram Bot (Optionnel - Notifications Waitlist)

**Étapes:**

```
1. Ouvrir Telegram, chercher @BotFather
2. Envoyer: /newbot
3. Nom: "ADSCALE Stock Alerts"
4. Username: @adscale_alerts_bot (ou autre disponible)
5. Copier le token reçu
6. Ajouter dans .env.local:
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
7. (Optionnel) Configurer webhook pour recevoir /start:
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://votre-site.com/api/telegram/webhook"
```

**Pour tester:**
- Chercher votre bot sur Telegram
- Envoyer /start
- Bot devrait répondre

**Documentation complète:** Voir `WAITLIST_IMPLEMENTATION.md`

---

## 🟡 IMPORTANT - Features manquantes

### 6. Section Waitlist dans Admin Panel

**À implémenter:**

```typescript
// Dans app/admin/page.tsx, ajouter tab "Waitlist"

// Afficher:
- Liste des inscrits par produit
- Telegram username
- Email (si fourni)
- Date inscription
- Status (notified: oui/non)

// Actions:
- Bouton "Notify All for Product X"
- Bouton "Mark as Notified" (sélection multiple)
- Bouton "Delete" par ligne
```

**API déjà prête:**
- GET `/api/admin/waitlist` → Liste
- POST `/api/admin/waitlist` → Notifier
- DELETE `/api/admin/waitlist?id=xxx` → Supprimer

---

### 7. Corriger les API 404 dans devlog

**APIs manquantes détectées:**

```
GET /api/admin/analytics → 404
GET /api/admin/smm → 404
GET /api/admin/support/pending-count → 404
```

**Options:**
1. **Les implémenter** si vous voulez ces features
2. **Retirer du frontend** les appels à ces APIs
3. **Retourner mock data** temporairement

**Recommandation:** Retirer les appels pour l'instant (pas critiques)

---

### 8. Bot Discord Notifications (1-2h)

**Cahier des charges:**
- Notification à chaque vente
- Alerte stock bas
- Alerte erreurs
- Récap quotidien

**Implémentation:**

```typescript
// lib/discord.ts
export async function sendDiscordNotification(webhookUrl: string, message: string) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: message,
      embeds: [...]
    })
  });
}

// Dans create-payment API, après livraison:
await sendDiscordNotification(
  process.env.DISCORD_WEBHOOK_URL,
  `🎉 New sale: $${amount} - Order ${orderId}`
);
```

**Configuration:**
1. Discord → Paramètres serveur → Intégrations → Webhooks
2. Créer webhook
3. Copier URL
4. Ajouter dans settings admin

---

### 9. Export CSV Fonctionnel (30 min)

**À implémenter:**

```typescript
// app/api/admin/export/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // orders | logs | stock

  if (type === "orders") {
    const orders = await query("SELECT * FROM orders ORDER BY created_at DESC");
    const csv = generateCSV(orders);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=orders.csv"
      }
    });
  }
  // ...
}
```

**UI Admin:**
- Bouton "Export CSV" dans chaque section
- Téléchargement automatique

---

### 10. Rate Limiting (1h)

**Protection contre DDoS/spam:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 req/min
});

// Dans create-payment API:
const identifier = getClientIP(request);
const { success } = await ratelimit.limit(identifier);
if (!success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

**Services:**
- Upstash Redis (gratuit jusqu'à 10k req/jour)
- Ou en-mémoire simple avec Map

---

### 11. Expiration Auto Orders (1h)

**Cron job pour marquer orders expirés:**

```typescript
// app/api/cron/expire-orders/route.ts
export async function GET() {
  // Sécurité: Vérifier cron secret
  const secret = request.headers.get("Authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Marquer orders >30min comme failed
  const result = await query(`
    UPDATE orders
    SET status = 'failed', updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '30 minutes'
    RETURNING id
  `);

  // Libérer stock réservé
  await query(`
    UPDATE stock_items
    SET status = 'available', order_id = NULL
    WHERE order_id = ANY($1::text[])
  `, [result.map(r => r.id)]);

  return NextResponse.json({ expired: result.length });
}
```

**Configuration Vercel Cron:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-orders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

### 12. Page /account (2h)

**Historique commandes client:**

```typescript
// app/account/page.tsx
// Formulaire: entrer email
// Affiche toutes les commandes de cet email
// Re-téléchargement si token valide
```

---

### 13. Page /support (1h)

**Formulaire contact + FAQ:**

```typescript
// app/support/page.tsx
// Formulaire: email, order ID, message
// API send email admin
// FAQ étendue
```

---

## 🟢 OPTIONNEL - Améliorations futures

### 14. Email Delivery (au lieu de téléchargement .txt)

**Utiliser Resend, SendGrid, ou SMTP:**

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'orders@votre-domaine.com',
  to: customerEmail,
  subject: 'Your ADSCALE Account',
  html: `
    <h1>Order Confirmed!</h1>
    <p>Email: ${account.email}</p>
    <p>Password: ${account.password}</p>
  `
});
```

---

### 15. Analytics & Tracking

**Ajouter Google Analytics ou PostHog:**

```typescript
// app/layout.tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
```

---

### 16. Tests Automatisés

**Playwright ou Cypress:**

```typescript
test('checkout flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Buy Now');
  await page.fill('input[type=email]', 'test@example.com');
  // ...
});
```

---

### 17. Monitoring & Error Tracking

**Sentry pour capturer erreurs:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## ✅ CHECKLIST DÉPLOIEMENT

**Avant de déployer:**

- [ ] `.env.local` complet avec VRAIES valeurs
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Admin account créé
- [ ] Wallets configurés dans settings admin
- [ ] Stock initial importé (au moins quelques comptes)
- [ ] Build Next.js réussi (`npm run build`)
- [ ] Test local complet (`npm run dev`)
  - [ ] Checkout flow fonctionne
  - [ ] Admin login fonctionne
  - [ ] Stock s'affiche correctement
  - [ ] Quantité selector fonctionne
  - [ ] Waitlist form s'affiche quand stock bas

**Après déploiement:**

- [ ] Test checkout avec vraie crypto (petit montant)
- [ ] Vérifier email/download reçu
- [ ] Tester admin panel en production
- [ ] Vérifier logs aucune erreur
- [ ] Setup monitoring (Sentry, Analytics)
- [ ] Backup database régulier
- [ ] SSL actif (https://)
- [ ] Domain configuré

---

## 📊 PRIORITÉS RECOMMANDÉES

### Sprint 1 - Production Ready (3-4h)
1. ✅ Variables d'env + wallets (30 min)
2. ✅ Database migration + admin (30 min)
3. ✅ Import stock initial (15 min)
4. ✅ Tests checkout complet (30 min)
5. ⏳ Corriger APIs 404 (30 min)
6. ⏳ Section Waitlist admin (1h)
7. ⏳ Deploy + tests prod (30 min)

### Sprint 2 - Features Essentielles (4-5h)
8. ⏳ Bot Discord notifications (1-2h)
9. ⏳ Export CSV (30 min)
10. ⏳ Rate limiting (1h)
11. ⏳ Expiration auto orders (1h)
12. ⏳ Telegram Bot config (30 min)

### Sprint 3 - Polish (3-4h)
13. ⏳ Page /account (2h)
14. ⏳ Page /support (1h)
15. ⏳ Analytics tracking (30 min)

### Sprint 4 - Advanced (optionnel)
16. Email delivery
17. Tests automatisés
18. Monitoring Sentry
19. A/B testing
20. Marketing automation

---

## 🚨 SÉCURITÉ - À VÉRIFIER

### Avant Production:

1. **Secrets protégés:**
   - [ ] `.env.local` dans `.gitignore`
   - [ ] Aucun secret dans le code
   - [ ] JWT_SECRET fort et unique

2. **Wallets:**
   - [ ] Adresses testées et valides
   - [ ] Contrôle privé des wallets
   - [ ] Backup des seed phrases

3. **Database:**
   - [ ] SSL mode enabled
   - [ ] Backups automatiques configurés
   - [ ] Accès restreint (IP whitelist si possible)

4. **Admin:**
   - [ ] Password fort
   - [ ] 2FA si possible
   - [ ] Logs d'accès activés

5. **Rate Limiting:**
   - [ ] Sur tous les endpoints publics
   - [ ] Spécialement /api/crypto/create-payment

6. **HTTPS:**
   - [ ] SSL certificate valide
   - [ ] Redirect HTTP → HTTPS
   - [ ] HSTS headers

---

## 📞 SUPPORT & RESOURCES

### Documentation:
- `ANALYSE_COMPLETE.md` - Analyse initiale (82/100)
- `PROGRESS_REPORT.md` - Progression (90/100)
- `WAITLIST_IMPLEMENTATION.md` - Système waitlist
- `QR_CODE_IMPLEMENTATION.md` - QR Code checkout
- `SAVE_SETTINGS_IMPLEMENTATION.md` - Settings admin
- `LIVE_CRYPTO_RATES_IMPLEMENTATION.md` - Taux live
- `TELEGRAM_WIDGET_IMPLEMENTATION.md` - Widget Telegram
- `SECURITY_FIXES.md` - Corrections sécurité

### APIs Utilisées:
- **CoinGecko API** - Taux crypto (gratuit)
- **NOWPayments** - Paiements crypto (0.5-1% fees)
- **Telegram Bot API** - Notifications
- **Next.js** - Framework
- **PostgreSQL** - Database
- **Vercel** - Hosting (recommandé)

### Contact Support:
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- PostgreSQL: https://www.postgresql.org/docs/
- Telegram Bot: https://core.telegram.org/bots/api

---

## 💰 COÛTS ESTIMÉS

### Services Gratuits:
- ✅ Vercel Hosting (Hobby tier)
- ✅ Neon PostgreSQL (Free tier)
- ✅ CoinGecko API (Free)
- ✅ Telegram Bot (Free)

### Services Payants:
- 💵 Domain (.com): ~$12/an
- 💵 NOWPayments: 0.5% par transaction
- 💵 Email (Resend): $20/mois (50k emails)
- 💵 Upstash Redis: $10/mois (rate limiting)

**Total minimal:** ~$1-2/mois (+ domain)

---

## 🎯 OBJECTIF FINAL

**Site 100% fonctionnel avec:**
- ✅ Affichage stock temps réel
- ✅ Sélecteur quantité
- ✅ Checkout crypto (BTC, ETH, USDT)
- ✅ Livraison automatique
- ✅ Admin panel complet
- ✅ Waitlist + notifications Telegram
- ✅ QR Code mobile
- ✅ Taux crypto live
- ⏳ Discord notifications
- ⏳ Analytics & monitoring

**Score actuel:** 90/100  
**Score target:** 95-100/100

**Temps restant estimé:** 8-12 heures de dev

---

**Bon courage ! 🚀**

Si besoin d'aide sur une étape spécifique, demandez !
