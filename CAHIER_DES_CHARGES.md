# Cahier des charges — Digital Store (Custom)

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | Next.js (React) |
| Backend | Node.js + Express (ou Next.js API routes) |
| Base de données | PostgreSQL |
| Paiement crypto | BTCPay Server (self-hosted) ou NOWPayments (API) |
| Auth admin | JWT + bcrypt |
| Hébergement | VPS (Hetzner, DigitalOcean) |

---

## 1. Pages Frontend (Client)

### `/` — Homepage / Shop
- Liste des produits avec : nom, description courte, prix, stock disponible en temps réel
- Badge "En stock / Rupture"
- Bouton "Acheter" → ouvre modale ou redirige vers checkout
- Design minimaliste, dark mode
- Bandeau ou icônes de réassurance bien visibles : "Livraison instantanée", "Paiement sécurisé", "Support Discord"

### `/product/:id` — Page produit
- Description complète
- Quantité à commander
- Prix total calculé dynamiquement
- Bouton checkout

### `/checkout` — Paiement
- Résumé de commande
- Génération d'une adresse crypto unique (QR code inclus)
- Timer de 15–30 min pour le paiement
- Statut en temps réel : `En attente → Détecté → Confirmé → Livré`
- Prix affiché en crypto ET en USD en temps réel (via API de taux de change, ex: CoinGecko API)
- Email pré-rempli automatiquement via localStorage (sauvegardé à la première commande)

### `/order/:id` — Confirmation & livraison
- Statut de la commande
- Bouton de téléchargement du `.txt` (actif uniquement si payé)
- Lien temporaire (expire après 24h ou X téléchargements)
- ID de transaction crypto affiché

### `/account` — Espace client (optionnel)
- Historique des commandes liées à l'email
- Re-téléchargement des fichiers achetés
- Identification par email saisi à la commande

### `/support` — Contact
- Formulaire simple (email + message + ID de commande)
- FAQ statique : délai de livraison, politique de remboursement, etc.

### Widget Telegram (global — toutes les pages)
- Bouton fixe en bas à droite de l'écran (position `fixed`)
- Icône Telegram + label "Support" ou "Nous contacter"
- Au clic : ouvre directement un lien `https://t.me/ton_username` dans un nouvel onglet
- Configurable depuis l'admin (username Telegram modifiable sans toucher au code)
- S'affiche sur toutes les pages sauf le panel admin

---

## 2. Panel Admin (`/admin`)

Accès protégé par login (email + mot de passe hashé, session JWT).

### Dashboard principal
- CA du jour / semaine / mois
- Nombre de ventes
- Stock restant par produit
- 5 dernières commandes
- Alertes : stock faible (< seuil configurable), erreurs de livraison

### Produits
- Créer / modifier / supprimer un produit
- Champs : nom, description, prix, catégorie, seuil d'alerte stock
- Activer / désactiver la vente

### Inventaire (Stock)
- Vue par produit : total importé, vendus, restants
- Import en masse : coller une liste `compte:mdp` (1 par ligne) ou upload `.txt` / `.csv`
- Chaque ligne = 1 unité avec statut : `disponible | réservé | vendu | erreur`
- Détection et blocage des doublons à l'import

### Commandes
- Liste complète de toutes les commandes
- Filtres : date, produit, statut, montant, wallet
- Statuts : `pending | paid | delivered | failed | refunded`
- Détail d'une commande : client, produit, unité livrée, ID transaction crypto, timestamp
- Actions manuelles : marquer comme remboursé, re-livrer, annuler

### Paramètres
- Adresses wallet crypto par devise
- Seuils d'alerte de stock par produit
- Durée de validité des liens de téléchargement
- Gestion des comptes administrateurs
- Clés API (passerelle crypto, service email)

### Logs
- Journal horodaté de toutes les actions : imports, ventes, livraisons, erreurs
- Export CSV : ventes, stock, logs

---

## 3. Base de données

```sql
products         -- id, name, description, price, category, active, min_alert
stock_items      -- id, product_id, value (credentials), status, order_id, created_at
orders           -- id, product_id, quantity, email, crypto_address, tx_id, status, created_at
download_tokens  -- id, order_id, token, expires_at, uses_count, max_uses
admins           -- id, email, password_hash, role
logs             -- id, action, details, admin_id, created_at
```

---

## 4. Workflow de vente (automatisation)

```
1.  Client choisit produit + quantité
2.  Saisit son email
3.  Backend génère une adresse crypto unique (ou invoice BTCPay)
4.  Client paie dans le délai imparti (timer affiché)
5.  Webhook crypto → backend reçoit la confirmation
6.  Backend vérifie le montant et le statut
7.  N unités de stock passent de "disponible" → "réservé" → "vendu"
8.  Fichier .txt généré avec les N comptes
9.  Token de téléchargement créé (lien temporaire)
10. Client redirigé vers /order/:id + email envoyé avec le lien
11. Log complet de la transaction enregistré
```

### Sécurités du workflow
- Vérification du montant reçu (tolérance ±0.5% pour les fluctuations crypto)
- Anti-double livraison : idempotence sur le `tx_id`
- Expiration automatique des commandes non payées (cron job)
- Liens de téléchargement à usage limité et durée limitée

---

## 5. Intégration paiement crypto

### Option A — BTCPay Server (recommandé)
- Self-hosted, zéro frais de plateforme
- Supporte BTC, LTC, ETH, USDT et autres
- Webhook natif pour détecter les paiements confirmés
- Nécessite un VPS dédié pour l'hébergement

### Option B — NOWPayments / CoinGate
- API simple, intégration rapide
- Frais de 0.5–1% par transaction
- Webhook disponible
- Aucune infrastructure à gérer

---

## 6. Sécurité

- HTTPS obligatoire (certificat SSL)
- Panel admin inaccessible sans authentification
- Rate limiting sur tous les endpoints publics
- Validation stricte des inputs (protection XSS, injection SQL)
- Toutes les clés API stockées en variables d'environnement (jamais en dur)
- Logs d'accès admin horodatés et immuables

---

## 7. Bot Discord (notifications admin)

Bot Discord qui envoie des alertes automatiques sur un channel privé :

- Notification à chaque vente : produit, montant, heure, ID transaction
- Alerte quand le stock d'un produit passe sous le seuil configuré
- Alerte en cas d'erreur de livraison
- Récap quotidien : CA du jour, nombre de ventes, stock restant

Configuration depuis l'admin :
- Webhook Discord URL (configurable sans toucher au code)
- Choix des événements à notifier (on/off par type d'alerte)

---

## 8. Ordre de développement recommandé

| Étape | Tâche |
|---|---|
| 1 | Base de données + modèles (schéma PostgreSQL) |
| 2 | Auth admin (login, JWT, middleware) |
| 3 | Import stock + gestion inventaire (admin) |
| 4 | Intégration paiement crypto + webhook |
| 5 | Workflow de livraison automatique |
| 6 | Pages client (shop, checkout, confirmation) |
| 7 | Dashboard admin (stats, commandes, alertes) |
| 8 | Tokens de téléchargement + envoi email |
| 9 | Export CSV, logs, alertes de stock |
