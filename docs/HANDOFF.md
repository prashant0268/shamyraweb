# Kind Flames — Operations handoff (Oct 2026 rebuild)

## One-time setup you need to do (I can't do these from the CLI)

1. ~~Enable billing (Blaze)~~ **Done 2026-10-15.** All 11 Cloud Functions are deployed on Node 22. (Kept for reference:)
   https://console.firebase.google.com/project/shamyra-web/usage/details
   Cloud Functions (checkout pricing, PayPal, Stripe, emails, admin) cannot deploy or run without it. The old functions already stopped responding (HTTP 500) for this reason, so PayPal on the old site was already broken.
   After enabling: `firebase deploy --only functions --project shamyra-web` (or just `npm run deploy`).
2. ~~Set up Firebase Storage~~ **Done 2026-10-15** — rules deployed; photo upload in the product editor works.
   Then add `"storage": { "rules": "storage.rules" }` back into `firebase.json` and deploy. Until then, photo upload in the admin won't work (you can still paste image URLs).
3. **Admin access:** sign in on the site with `prashant0268@gmail.com` (Google or email). The `ensureAdmin` function grants the admin claim to emails listed in `functions/.env` → `ADMIN_EMAILS`. Then open `/admin`.
4. **Seed the catalog:** Admin → Products → “Import default catalog to Firestore”. Until you do, the store serves the built-in catalog (read-only).
5. **Stripe (optional, when ready):** activate the Stripe account, set the live secret in Secret Manager (`firebase functions:secrets:set STRIPE_SECRET_KEY`), add `VITE_STRIPE_PUBLIC_KEY_LIVE` is NOT needed (we use Stripe Checkout, server-side only). Then Admin → Settings → “Card payments enabled”.
   - Webhook (recommended): create an endpoint in Stripe for `checkout.session.completed` → `https://us-central1-shamyra-web.cloudfunctions.net/stripeWebhook`, store its signing secret as `STRIPE_WEBHOOK_SECRET`, set `"stripeWebhook": true` in `functions/features.json`, redeploy functions. Without it, orders are still verified server-side when the customer lands on the confirmation page.
6. ~~Transactional email~~ **Done 2026-10-15** — Resend enabled (`functions/features.json` → `"resend": true`, domain kindflames.com verified). Emails send from orders@kindflames.com, reply-to hello@kindflames.com.
7. **Discount code:** create `WELCOME10` (10%, first order only) in Admin → Discounts; the homepage newsletter promises it.
8. **PayPal live:** already configured via secrets `PAYPAL_*` and `PAYPAL_MODE=live`. Sandbox is used automatically on localhost.

## Daily use
- Orders: Admin → Orders. “Mark fulfilled” → “Mark shipped” (enter tracking; customer gets an email) → “Mark delivered”. Refunds go back through Stripe/PayPal.
- Corporate: quote requests land in Admin → Corporate quotes and email you. Reply, then “Create invoice” sends a Stripe invoice (card/ACH, Net-30).
- Reviews: approve in Admin → Reviews; product ratings update automatically.
- Settings: shipping threshold/rates, sales-tax states, announcement bar, homepage sections, payment toggles.

## Dev
- `npm run dev` (Vite), `npm run build`, `npm run deploy` (build + firebase deploy).
- `node scripts/smoke.mjs http://127.0.0.1:4173 ./shots desktop|mobile` runs a headless Chrome smoke test against `vite preview --host 127.0.0.1 --port 4173`.
- `node scripts/optimize-images.mjs` regenerates WebP product images from `src/assets/images`.
- Catalog seed: `src/data/catalog.json` (copied to `functions/catalog.json` on deploy as the pricing fallback).
- Branch `claude/cranky-colden` has everything; `main` on GitHub is behind. The main checkout at `~/Projects/shamyraweb` has stale uncommitted files — run `git checkout -- . && git clean -fd src functions && git pull` there after merging.

## Tests
- `npm test` — 20 unit tests for server pricing (discounts, bundles, tax, shipping, stock).
- `npm run test:emulator` — same scenarios through the real Cloud Functions runtime + Firestore emulator (needs Java).
- Your global `firebase-tools` is 14.5; the functions emulator needs 15.x for firebase-functions v7 (`npm i -g firebase-tools@latest`). Deploys work on either.

## Subscriptions, inserts, reminders (added later on 2026-10-15)
- `/subscribe`: Candle of the Month ($24/mo) and Seasonal Spa Box ($69/qtr) via Stripe Billing. Gated by the same "Card payments enabled" switch. Customers manage/pause/cancel through the Stripe customer portal from `/account`.
- Admin → Subscriptions: "Sync from Stripe", then pick this period's candle/box and "Create shipment orders" (idempotent per billing period; orders show up in Orders to pack).
- Corporate quote form accepts a recipient CSV (name, address, address 2, city, state, zip, email, note). Admin → Corporate quotes: download it, and "Gift code + inserts" creates a 15% `GIFT-<COMPANY>` code and opens a printable 4×6 insert with a QR to `kindflames.com/?code=…` (the code auto-applies at checkout).
- Daily 3 pm ET job emails one reminder for bags abandoned at payment (1 h–3 d old). Delivered orders trigger a review-request email. Wishlist hearts on products (synced to the account).
