# Environments: production and test

Kind Flames runs on two Firebase projects from the same codebase.

| | Production | Test |
|---|---|---|
| Firebase project id | `shamyra-web` | `kindflames-test` (placeholder: see "Changing the test project id") |
| `.firebaserc` alias | `prod` (also `default`) | `test` |
| Site | https://kindflames.com | https://kindflames-test.web.app (optionally https://test.kindflames.com) |
| Frontend build | `npm run build` → `.env.production` | `npm run build:test` → `.env.test` |
| Functions config | `functions/.env` + `functions/.env.shamyra-web` | `functions/.env` + `functions/.env.kindflames-test` |
| `IS_PRODUCTION` | `true` | `false` |
| Stripe | live keys (account "Kind Flames") | sandbox **Shamyra-Web-Sandbox** keys (`sk_test_…`) |
| PayPal | always live (follows `IS_PRODUCTION`) | always sandbox, cannot go live |
| Checkout origins | site + `shamyra-web.web.app`/`.firebaseapp.com`, **no localhost** | site + hosting domains + localhost dev ports |
| Google Analytics / Meta Pixel | on | off |
| Search engines | indexed | `noindex,nofollow` on every page |
| On-screen marker | none | "TEST ENVIRONMENT" chip, bottom right |
| Admin logins | emails in `ADMIN_EMAILS` | same list by default; its own Auth users and passwords |

Nothing is shared between the two: separate Firestore, Auth users, Storage, Functions, secrets and payment accounts.

## How the code decides

- **Frontend**: `src/lib/env.ts` exposes `isProdEnv()`, `APP_ENV` and `ENV_LABEL` from the build-time variable `VITE_ENV`
  (`.env.production` sets `production`, `.env.test` sets `test`). When `VITE_ENV` is missing, `vite build` counts as
  production and `vite dev` does not. Everything that used to check `window.location.hostname === 'kindflames.com'`
  now uses this: the card-payment gate in `Checkout.tsx` and `Subscribe.tsx`, the PayPal client id
  (`VITE_PAYPAL_CLIENT_ID_LIVE` in production, `VITE_PAYPAL_CLIENT_ID` otherwise), Google Analytics in
  `src/config/firebase.ts`, the robots meta in `src/lib/seo.ts`, the chip in `Layout.tsx`, and a static
  `<meta name="robots" content="noindex,nofollow">` that `vite.config.ts` injects into non-production HTML.
- **Firebase web config** (`VITE_FIREBASE_*`) comes from the env file of the mode being built. Vite layers
  `.env` → `.env.local` → `.env.<mode>` → `.env.<mode>.local`, so your machine-local `.env` can point at the
  test project for `npm run dev` without ever reaching the production build.
- **Functions**: `functions/index.js` reads `SITE_URL`, `IS_PRODUCTION`, `EXTRA_ORIGINS`, `ADMIN_EMAILS`,
  `OWNER_EMAIL`, `FROM_EMAIL`, `REPLY_TO` (and `marketing.js` reads `RESEND_AUDIENCE_ID`) from `process.env`.
  The Firebase CLI loads `functions/.env` and then `functions/.env.<projectId>` on deploy and in the emulator.
  `ALLOWED_ORIGINS` = `SITE_URL` (with and without `www.`) + `<projectId>.web.app` + `<projectId>.firebaseapp.com`
  + `EXTRA_ORIGINS`, plus the Vite localhost ports **only when `IS_PRODUCTION=false`** (logic in
  `functions/payments.js`, unit-tested). Code defaults equal the production values, so a missing env file still
  means production.
- **PayPal environment** (since 2026-11-24): `IS_PRODUCTION=true` → always **live**, otherwise always **sandbox**.
  The browser's `origin` no longer plays any part (it used to: an order started from `http://localhost:5173` on
  production went to PayPal sandbox and could be "paid" with a free sandbox buyer). Each PayPal order stores
  `paypalEnv` ("live" | "sandbox") at creation; capture, refund, the reconciler and the webhook use that field, and
  refuse an order whose `paypalEnv` doesn't match the project. Orders from before the field existed use the
  project's environment. The `PAYPAL_MODE` secret is no longer read or bound (it can be left in Secret Manager or
  deleted).
- **Card payments gate**: on production `createStripeCheckout` / `createSubscriptionCheckout` refuse unless Admin →
  Settings → "Card payments enabled" is on, whatever origin the browser sends (the `*.web.app` origin used to skip
  the check). Test projects always allow cards.
- **Capture checks**: a PayPal order is marked paid only when `purchase_units[0].payments.captures[0].status` is
  `COMPLETED` **and** its amount/currency equal the order's `total`/USD (and `custom_id` is the order id). A `PENDING`
  capture (eCheck, PayPal review) keeps the order `pending`, records `paypalCaptureStatus`/`paypalPendingReason` and
  emails the owner once; a mismatch sets `paymentReview` and emails the owner, and is never marked paid. A capture
  retry that PayPal answers with `ORDER_ALREADY_CAPTURED` reads the order and applies the same checks.
  Stripe sessions with `payment_status` `paid` **or** `no_payment_required` (100% discount) count as paid.
- **Secrets** never live in files: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET`, `PAYPAL_CLIENT_ID_LIVE`, `PAYPAL_CLIENT_SECRET_LIVE`, `PAYPAL_WEBHOOK_ID`, `RESEND_API_KEY`
  are Secret Manager secrets, set once per project. `STRIPE_WEBHOOK_SECRET` / `PAYPAL_WEBHOOK_ID` are only needed
  once the matching feature flag is on (see "Payment webhooks and reconciliation").

## Payment webhooks and reconciliation

Three layers make sure a paid order ends up `paid` even when the customer's browser never comes back:

1. **Browser return** (always on): `capturePayPalOrder` / `verifyStripePayment` when the customer lands back on the site.
2. **Reconciler** (always on, both projects): `reconcilePendingPayments` runs every 30 minutes. For every `pending`
   order older than 15 minutes (up to 7 days) that has a `stripeSessionId` or `paypalOrderId`, it asks Stripe/PayPal
   and marks it paid through the same checks. A PayPal order the buyer approved but never captured (tab closed after
   "Pay Now") is captured. `abandonedCartReminder` and admin "Delete unpaid order" (`deleteOrder`) also ask the
   provider first: they never email or delete an order the provider reports paid (it gets marked paid instead), and
   `deleteOrder` refuses if the provider can't be reached.
3. **Webhooks** (behind feature flags, off by default on production): `stripeWebhook` and `paypalWebhook`.

### Production: turning on the Stripe webhook (owner)

1. Stripe dashboard (live mode, account "Kind Flames") → Developers → Webhooks → **Add endpoint**:
   - URL: `https://us-central1-shamyra-web.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`
2. Copy the endpoint's signing secret (`whsec_…`) and store it:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET -P prod
   ```
3. Flip the flag in `functions/features.shamyra-web.json` to `"stripeWebhook": true` (it is committed as `false`;
   the function is not even deployed while it's false, so the secret must exist first or the deploy fails).
4. Commit, then `firebase deploy -P prod --only functions` (or `npm run deploy:prod` from `main`).
5. Stripe → the endpoint → "Send test event" (`checkout.session.completed`): expect HTTP 200. A paid order with no
   matching order id is logged and ignored.

What it does: `checkout.session.completed` / `async_payment_succeeded` mark the order paid (session must belong to
the order); `async_payment_failed` sets `paymentStatus: failed` and emails the owner; `charge.refunded` sets
`refunded` / `partially_refunded` (refunds made in the Stripe dashboard show up in admin); `charge.dispute.created`
stores `dispute` on the order and emails the owner. Subscription checkouts are ignored here (handled by
`verifySubscription`). Handler errors return 500 so Stripe retries.

### Turning on the PayPal webhook (owner, optional; test first)

1. PayPal developer dashboard → Apps & Credentials → (Live tab for production, Sandbox tab for test) → the app whose
   credentials are in `PAYPAL_CLIENT_ID_LIVE` (prod) / `PAYPAL_CLIENT_ID` (test) → **Add webhook**:
   - URL: `https://us-central1-shamyra-web.cloudfunctions.net/paypalWebhook` (test:
     `https://us-central1-kindflames-test.cloudfunctions.net/paypalWebhook`)
   - Events: `Payment capture completed`, `Payment capture denied`, `Payment capture refunded` (optionally
     `Payment capture pending`)
2. Copy the **Webhook ID** PayPal shows and store it: `firebase functions:secrets:set PAYPAL_WEBHOOK_ID -P prod`
   (or `-P test`).
3. Set `"paypalWebhook": true` in `functions/features.<projectId>.json`, commit, deploy functions to that project.

Every event is verified with PayPal's `verify-webhook-signature` API (using `PAYPAL_WEBHOOK_ID`) and then the order is
re-read from the PayPal API; the event body itself is never trusted for amounts.

### Auditing past PayPal orders

`functions/scripts/audit-paypal-origins.mjs` is read-only. It lists paid PayPal orders whose origin was not a
production host (the pre-fix exploit path). Check each printed capture id in the live PayPal account; if live PayPal
has no such payment, the order was never really paid.
```bash
npx -y firebase-tools@15 emulators:exec --project prod --only functions "node functions/scripts/audit-paypal-origins.mjs"
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server using the git-ignored `.env` (point it at the test project) |
| `npm run build` | production bundle (`.env.production`) |
| `npm run build:test` | test bundle (`.env.test`, noindex, TEST chip) |
| `npm run deploy` / `npm run deploy:prod` | build + `firebase deploy -P prod` (everything: hosting, functions, rules, indexes, storage) |
| `npm run deploy:test` | `build:test` + `firebase deploy -P test` |
| `npm run deploy:test:hosting` | `build:test` + hosting only, for quick UI checks on the test site |
| `npm run seed:test` / `npm run seed:test:apply` | dry-run / write the starter data into the test project (see "Seeding") |
| `npm run test:emulator` | pricing tests against the emulator, `--project prod` alias (no real traffic) |

`firebase deploy` with no `-P` uses the `default` alias, which is production. Prefer the explicit scripts.

## One-time setup of the test project (owner, in the console)

1. **Create the project** at https://console.firebase.google.com → Add project → name "Kind Flames Test", project id
   `kindflames-test` (if Firebase assigns a different id, see "Changing the test project id"). Google Analytics: off.
2. **Billing**: upgrade to **Blaze** (Cloud Functions gen 2 need it). Set a budget alert at a few dollars.
3. **Authentication** → Get started → Sign-in method: enable **Email/Password**, **Google** and **Anonymous**
   (guest checkout uses anonymous sign-in). Settings → **Authorized domains**: `kindflames-test.web.app` and
   `kindflames-test.firebaseapp.com` are there already; add `localhost` if missing and `test.kindflames.com` if you
   connect the custom domain. Then create your admin user: sign in once on the test site with an email in
   `ADMIN_EMAILS` (`functions/.env`); `ensureAdmin` grants the claim on first sign-in, exactly as in production.
4. **Firestore Database** → Create database → location **nam5 (United States)**, production mode (rules deploy
   from `firestore.rules`).
5. **Storage** → Get started → same region; rules deploy from `storage.rules`.
6. **Web app**: Project settings → General → Your apps → Add app → Web, nickname "storefront", no Hosting checkbox
   needed. Copy the config object into `.env.test` (`VITE_FIREBASE_API_KEY`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`;
   auth domain, project id and storage bucket are pre-filled). Commit `.env.test`: these values are public.
7. **Hosting**: nothing to click; the first `npm run deploy:test` creates the site `kindflames-test.web.app`.

### Secrets for the test project

Run from the repo root (each prompts for the value, or pipe it in). Use the **Shamyra-Web-Sandbox** Stripe sandbox keys (Stripe → Switch to sandbox → Shamyra-Web-Sandbox → Developers → API keys) and **PayPal
sandbox** app credentials. The PayPal `*_LIVE` secrets must exist because the functions bind them; set them to the
sandbox values (or any placeholder) — with `IS_PRODUCTION=false` they are never used.

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY -P test
```
```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID -P test
```
```bash
firebase functions:secrets:set PAYPAL_CLIENT_SECRET -P test
```
```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID_LIVE -P test
```
```bash
firebase functions:secrets:set PAYPAL_CLIENT_SECRET_LIVE -P test
```
```bash
firebase functions:secrets:set RESEND_API_KEY -P test
```
Resend: either reuse the production key (emails will really send, so `ADMIN_EMAILS`/`OWNER_EMAIL` are the only
recipients that matter during tests) or create a second Resend API key for the test project.

Stripe webhook (on for test via `functions/features.kindflames-test.json`; a `features.<projectId>.json` overrides `features.json` for that project only. Live on test since 2026-10-22): in the Stripe sandbox **Shamyra-Web-Sandbox** → Developers →
Webhooks → endpoint `https://us-central1-kindflames-test.cloudfunctions.net/stripeWebhook`. Since 2026-11-24 the
handler also understands `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`charge.refunded` and `charge.dispute.created`: edit the existing endpoint and add those events (the signing secret
doesn't change).

Production secrets are untouched by any of this; they already exist in `shamyra-web`.

### Frontend public ids

- `VITE_PAYPAL_CLIENT_ID` (sandbox client id) belongs in your local `.env` (used by `npm run dev` and
  `npm run build:test`). `VITE_PAYPAL_CLIENT_ID_LIVE` is used only by production builds.
- Leave `VITE_META_PIXEL_ID` empty in `.env.test` so the pixel never loads on the test site.

### First deploy and seed

```bash
npm run deploy:test
```
Then put the starter data in (products from `src/data/catalog.json`, `settings/store` defaults, the `WELCOME10`
discount). Dry run first, then apply:
```bash
npm run seed:test
```
```bash
npm run seed:test:apply
```
The seed never overwrites existing products and refuses to run against the `prod` alias.

Finally open https://kindflames-test.web.app: you should see the "TEST ENVIRONMENT" chip, and checkout should
offer PayPal sandbox and (because `IS_PRODUCTION=false`) the card option even when "Card payments" is off in
settings. Use Stripe test cards (`4242 4242 4242 4242`) and a PayPal sandbox buyer account.

### Optional: test.kindflames.com

Firebase console (test project) → Hosting → Add custom domain → `test.kindflames.com`. Firebase shows a TXT record
for verification and then a CNAME. In Namecheap → Advanced DNS add them (CNAME host `test` → the
`kindflames-test.web.app` target Firebase gives). Then:

1. Authentication → Settings → Authorized domains → add `test.kindflames.com`.
2. `functions/.env.kindflames-test`: `SITE_URL=https://test.kindflames.com` and add
   `https://kindflames-test.web.app` to `EXTRA_ORIGINS`.
3. Redeploy functions: `firebase deploy -P test --only functions`.

### Changing the test project id

If the id is not `kindflames-test`, change it in exactly these places:
`.firebaserc` (`test` alias), `.env.test` (auth domain, project id, storage bucket), rename
`functions/.env.kindflames-test` to `functions/.env.<new-id>` and update `SITE_URL` inside it, the
`!functions/.env.kindflames-test` line in `.gitignore`, and the two `kindflames-test` mentions in `.env.example`.

## Workflow: branch → test → prod

1. Work on a branch (worktree sessions do this already). `npm run build`, `npm test`, `npx tsc --noEmit`.
2. Deploy the branch to the test project: `npm run deploy:test` (or `deploy:test:hosting` for UI-only changes).
   Click through on https://kindflames-test.web.app with sandbox PayPal / Stripe test cards. Admin at `/admin`.
3. Merge to `main`.
4. From `main`: `npm run deploy:prod`. Production is only ever deployed from `main`.

Rules and indexes deploy with both commands, so a rules change is exercised on test first. Data never moves
between the projects; re-run `seed:test:apply` after wiping the test Firestore if you want a clean slate.

## Local development

Copy `.env.example` to `.env` and fill in the **test** project's web config plus the PayPal sandbox client id.
`npm run dev` then talks to the test Firestore/Auth/Functions, so you can sign in, place sandbox orders and use
`/admin` without touching production data. `VITE_USE_EMULATOR=true` routes callables to a local functions
emulator instead (`npx -y firebase-tools@15 emulators:start --project test --only functions`).

Production functions no longer accept checkouts from `localhost` origins (since 2026-11-24), so `npm run dev`
pointed at the production config can browse but cannot check out. Point `.env` at the test project to test payments.
