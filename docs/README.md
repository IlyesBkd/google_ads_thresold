# Documentation

## Current reference

| Document | What it covers |
| --- | --- |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | Every route, its auth requirement and payload |
| [PAYMENT_GUIDE.md](PAYMENT_GUIDE.md) | NOWPayments setup, webhook, statuses |
| [DELIVERY_GUIDE.md](DELIVERY_GUIDE.md) | Stock, delivery and download tokens |
| [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md) | Original specification |

## archive/

Point-in-time reports from past work — implementation write-ups, one-off fix
notes, superseded audits and to-do lists. Kept for history only; **none of it
is authoritative**. When it disagrees with the code, the code is right.

## Where the real documentation lives

The database schema is `db/schema.sql`, with each change as a numbered
migration in `db/`. Environment variables are documented in `.env.example`.
Behaviour that needed explaining is commented at the point it happens.
