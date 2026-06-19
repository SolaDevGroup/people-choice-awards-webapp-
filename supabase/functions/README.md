# Stripe — Supporter Pass + FC coin packs (deploy runbook)

Three Edge Functions handle ALL purchases (the pass AND the 5 FC packs):

| Function | Verify JWT | Purpose |
|---|---|---|
| `create-checkout-session` | **ON** | Signed-in user → Checkout Session for `product` (pass / starter / fan / ultra / legend / champion) |
| `stripe-webhook` | **OFF** | Stripe → us; grants the pass **or** credits FC, by `metadata.kind` |
| `get-pass` | **OFF** | Public read of the live pass name/price for the modal |

Apple Pay + Google Pay need **no extra setup** — Stripe-hosted Checkout shows them
automatically (wallets are served from `checkout.stripe.com`, so no domain file needed).

FC amounts per pack are mapped in `create-checkout-session` (CATALOG): starter 500, fan
1200, ultra 2500, legend 6500, champion 15000 — matching `fcPacks` in `js/data.js`.

## Secrets (set once)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-provided. Set the
Stripe ones (the pass + the 5 pack product ids):

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_SUPPORTER_PASS_ID=prod_…
STRIPE_STARTER_PACK_ID=prod_…
STRIPE_FAN_PACK_ID=prod_…
STRIPE_ULTRA_PACK_ID=prod_…
STRIPE_LEGEND_PACK_ID=prod_…
STRIPE_CHAMPION_PACK_ID=prod_…
STRIPE_SUPPORTER_PASS_ID=prod_…
```

## Option A — Supabase CLI (no Docker needed for deploy)
```bash
brew install supabase/tap/supabase           # if not installed
supabase login                                # opens browser
supabase link --project-ref laypjrtpnvpubzqwnvnt
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy get-pass --no-verify-jwt
```

## Option B — Supabase Dashboard (no CLI)
1. Dashboard → **Edge Functions** → *Deploy a new function* → paste each `index.ts`.
   For `stripe-webhook` and `get-pass`, turn **Verify JWT OFF**.
2. Dashboard → **Edge Functions → Secrets** → add the three `STRIPE_*` values above.

## Stripe webhook endpoint
Dashboard → https://dashboard.stripe.com/test/webhooks → **Add endpoint**
- URL: `https://laypjrtpnvpubzqwnvnt.supabase.co/functions/v1/stripe-webhook`
- Event: `checkout.session.completed`
- Copy the signing secret (`whsec_…`) → it must match `STRIPE_WEBHOOK_SECRET`.

## DB (run each in the SQL Editor, once)
- `20260617090000_supporter_pass.sql` — `supporter_pass` + `has_supporter_pass()`
- `20260617100000_pass_voting.sql` — `pass_vote` + voting rules
- `20260617110000_fc_packs.sql` — `fc_purchase` + `credit_fc_purchase()` (FC pack crediting)

## Test
Use card `4242 4242 4242 4242`, any future expiry/CVC.
- **Pass:** land back on `/?pass=success`; webhook writes `supporter_pass` (+ initial vote).
- **FC pack:** land back on `/?fc=success`; webhook credits `profiles.fc_balance` via
  `credit_fc_purchase` (idempotent on session id) and logs an `fc_ledger` row.
⚠️ Apple Pay / Google Pay only render on a real **HTTPS domain** (not localhost) and,
for Apple Pay, in Safari.
