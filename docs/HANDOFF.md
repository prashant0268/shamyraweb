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
- Branch `claude/cranky-colden` == GitHub `main`; the main checkout at `~/Projects/shamyraweb` is kept in sync with `git pull`.
- Test records: delete quote requests from Admin → Corporate quotes (Delete link under each row) and unpaid/cancelled orders from the order detail page ("Delete unpaid order"). Paid orders can only be refunded or cancelled, never deleted.

## Tests
- `npm test` — 20 unit tests for server pricing (discounts, bundles, tax, shipping, stock).
- `npm run test:emulator` — same scenarios through the real Cloud Functions runtime + Firestore emulator (needs Java).
- Your global `firebase-tools` is 14.5; the functions emulator needs 15.x for firebase-functions v7 (`npm i -g firebase-tools@latest`). Deploys work on either.

## Subscriptions, inserts, reminders (added later on 2026-10-15)
- `/subscribe`: Candle of the Month ($24/mo) and Seasonal Spa Box ($69/qtr) via Stripe Billing. Gated by the same "Card payments enabled" switch. Customers manage/pause/cancel through the Stripe customer portal from `/account`.
- Admin → Subscriptions: "Sync from Stripe", then pick this period's candle/box and "Create shipment orders" (idempotent per billing period; orders show up in Orders to pack).
- Corporate quote form accepts a recipient CSV (name, address, address 2, city, state, zip, email, note). Admin → Corporate quotes: download it, and "Gift code + inserts" creates a 15% `GIFT-<COMPANY>` code and opens a printable 4×6 insert with a QR to `kindflames.com/?code=…` (the code auto-applies at checkout).
- Daily 3 pm ET job emails one reminder for bags abandoned at payment (1 h–3 d old). Delivered orders trigger a review-request email. Wishlist hearts on products (synced to the account).

## Google Merchant Center (added 2026-10-15)
- The product feed is generated at every build by `scripts/feed.mjs` (`npm run feed`, run automatically as `prebuild`) from `src/data/catalog.json` into `public/feed.xml`, so `dist/feed.xml` is always fresh. The file is git-ignored. Live URL: **https://kindflames.com/feed.xml**. One item per size variant (`g:id` = `<productId>-<variantId>`, grouped by `g:item_group_id`), one item for single-variant products (gift sets). Inactive products (`active: false`) are skipped; stock 0 becomes `out_of_stock`. No GTINs (`identifier_exists=false`), so Google may limit some listings but will accept the feed.
- Claim and verify the site (HTML tag method): Merchant Center → Business info → Website → **Verify** → "Add an HTML tag". Copy the token (the `content` value) into the `<meta name="google-site-verification" content="">` placeholder in `index.html`, redeploy, then click Verify, then **Claim**. If the domain is already verified in Search Console under the same Google account, Merchant Center picks that up and this step is instant.
- Add the feed: Merchant Center → Products → Add products → "Add products from a file" → **Scheduled fetch** → URL `https://kindflames.com/feed.xml`, country United States, language English, fetch **daily** (any time, the site rebuilds whenever we deploy). First processing takes up to an hour; then check Products → Diagnostics.
- Shipping: the feed states flat 6.95 USD to the US per item. Set up the real service once under Shipping and returns → Add shipping service → US, flat rate $6.95, **free over $60**; a shipping service there overrides the per-item value. Also fill in the return policy (30 days, matching `/shipping-returns`), tax (Merchant Center → Tax → NJ collected), and the store's contact/about/checkout URLs, which Google requires before listings go live.
- Note: catalog edits made in Admin → Products land in Firestore, not in `catalog.json`. Until the feed reads Firestore, keep `catalog.json` in sync (or re-export) before deploying, otherwise Google sees the build-time prices/stock. Follow-up candidate: generate the feed from Firestore in a Cloud Function.

## Meta Pixel (added 2026-10-15)
- Set `VITE_META_PIXEL_ID=<15–16 digit id>` in `.env.production` (Events Manager → Data sources → your pixel → Settings → Pixel ID), rebuild and deploy. When the variable is empty the pixel is not loaded at all and no `fbq` calls run.
- Events mirror GA4 from `src/lib/analytics.ts`: `view_item`→ViewContent, `add_to_cart`→AddToCart, `add_to_wishlist`→AddToWishlist, `begin_checkout`→InitiateCheckout, `purchase`→Purchase (value, USD; plus Subscribe for Stripe subscriptions), newsletter `sign_up`→Lead, corporate quote `generate_lead`→Lead. PageView fires once on load (single-page app: route changes are not sent as extra PageViews).
- Verify with the Meta Pixel Helper Chrome extension or Events Manager → Test events on the live site. Purchase events carry an `eventID` of `purchase:<order number>` for deduplication once the Conversions API is added server side (follow-up, task #5 in `docs/TASKS.md`).

## Marketing email (added 2026-10-15)

Automatic flows, all sent through Resend from orders@kindflames.com and all carrying a one-click unsubscribe link (`/api/unsubscribe`, also as a `List-Unsubscribe` header so Gmail shows its own button):

- **Welcome series** for newsletter signups: #1 immediately (with `WELCOME10` if that discount exists and is active), #2 three days later (how the candles are made + bestsellers), #3 four days after that (gift guide + code reminder).
- **Care tips** two days after an order is marked shipped, with sections for whatever categories were in the box.
- **Reorder nudge** 45 days after purchase, listing what they bought, unless they have ordered again since. Subscription shipments are excluded.
- The abandoned-bag reminder now respects unsubscribes too.

Where things live: `functions/marketing.js` (templates and timing; the `TIMING` constant at the top), state in Firestore `marketing/{email}` (Admin → Newsletter shows it), scheduler `marketingDrip` runs daily at 10:00 ET.

**You:**
1. Admin → Newsletter → **Send me test emails** to read all five templates in your inbox. Tell dev what to change.
2. Admin → Newsletter → **Sync to Resend audience** once. This imports past subscribers and customers as contacts and creates the “Kind Flames customers” audience in Resend (id stored server-side). New signups and buyers are added automatically from now on. Use Resend → Broadcasts for one-off campaigns to that audience.
3. Create `WELCOME10` in Admin → Discounts if you haven't; the welcome email checks for it and leaves the code out when missing.

