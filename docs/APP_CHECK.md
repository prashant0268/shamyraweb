# Abuse protection: App Check, throttling, and the Nov 2026 integrity fixes

Added 2026-11-24. Nothing here is deployed yet; see "Deploy order" at the bottom.

## What changed

| Area | Before | Now |
|---|---|---|
| Reviews | Anyone, including anonymous checkout guests, could write `approved: true` with any rating | Only real (non-anonymous) accounts; `approved` must be `false`; rating is an integer 1–5; only known keys; length limits; `createdAt` must be the server time. `onReviewWritten` clamps the rating and stamps `verified` (reviewer has a paid order containing the product). The storefront shows "Verified buyer" only when `verified === true`. |
| Newsletter | `newsletter/{email}` writable by anyone, so anyone could make the site email arbitrary addresses | Client writes are denied. The popup, footer and home forms call the `subscribeNewsletter` callable: email validated, max 10 signups/hour per IP and 3/day per address, existing subscribers get the same answer without a second welcome email. |
| Corporate quotes | No limit; HTML injection in the owner email | `submitQuote` allows 3/hour per IP and 3/hour per email address; every field is HTML-escaped; subjects have CR/LF stripped; provider errors are no longer returned to the browser (they're stored on the quote doc for admins). |
| Admin claim | Granted to any token whose `email` was in `ADMIN_EMAILS` | Needs `email_verified` and a Google or email/password sign-in. The claim is revoked (and refresh tokens revoked) when the address leaves `ADMIN_EMAILS`. An empty `ADMIN_EMAILS` never revokes anything, so a missing `.env` can't lock you out. |
| First-order codes (WELCOME10) | Checked per uid only; guests get a new uid every visit | Also checks paid orders by normalized email (lowercase, `+tag` removed, Gmail dots removed). New orders store `emailNormalized`. |
| Usage limits | Counted after payment, so concurrent checkouts could exceed `usageLimit` | Creating the pending order reserves a use (`discounts/{code}.reservedCount`) in the same transaction. Payment turns it into `usageCount`; cancel, delete, a new checkout by the same customer, or 26 h without payment (`releaseExpiredReservations`, hourly) gives it back. |
| Stock | Checked at quote time, decremented after payment outside a transaction, floored at 0 silently, never restocked | Re-checked and decremented inside the same transaction that marks the order paid. If the order wanted more than was left, stock goes to 0, the order gets `oversold: [...]` (shown in admin) and the owner gets an email. A full refund restocks by default (admin can untick); cancelling a refunded order restocks if that hadn't happened. |
| Low stock | — | `lowStockReport` emails `OWNER_EMAIL` every day at 08:00 ET with variants below **Admin → Settings → Low-stock alert below** (default 5). |
| Refunds | Full only, no customer email | Admin can refund any amount up to what's left, with a reason. The customer gets an email with the amount and reason. Partial refunds keep the order "paid"; the final one sets "refunded". Double clicks can't refund twice (`refundInFlight` claim). |
| Cancelling | A paid order could be set to cancelled without a refund (callable and direct Firestore write) | `updateOrderStatus` refuses `cancelled` on a paid order and refuses `refunded` unless the money was actually refunded. Firestore rules no longer let admins change `status` directly; it goes through the callables. |
| Notify me | Toast only, nothing saved | Sold-out sizes are selectable; "Notify me" stores the email via `requestBackInStock` in `backInStock/{productId_variant}/requests` (throttled). When a variant's stock goes from 0 to more than 0, `onProductStockChanged` emails everyone waiting (skipping unsubscribed addresses) once. |
| Paging | `onReviewWritten` and the marketing drip read fixed-size batches | Both page through every document. |

## App Check (off until you turn it on)

App Check makes Google reject callable requests that don't come from your site, which stops scripted abuse of
the public callables (`quoteCart`, `subscribeNewsletter`, `requestBackInStock`, `submitQuote`).

The web app already initializes App Check when `VITE_APPCHECK_SITE_KEY` is set, and does nothing when it isn't.
The server only enforces it when `functions/features.json` has `"appCheck": true`. Turn things on in this order,
or every browser call will be rejected:

1. **Create a reCAPTCHA Enterprise key** (Google Cloud console → Security → reCAPTCHA → Create key, type
   "Website", domains `kindflames.com`, `www.kindflames.com`, `shamyra-web.web.app`, `shamyra-web.firebaseapp.com`,
   plus `localhost` if you want it in dev). Use a separate key for `kindflames-test`.
   (A classic reCAPTCHA v3 key also works; then also set `VITE_APPCHECK_PROVIDER=v3`.)
2. **Register it in Firebase**: Firebase console → App Check → Apps → your web app → reCAPTCHA Enterprise →
   paste the site key → Save. Do **not** click "Enforce" for Cloud Functions here; enforcement is per function in
   code.
3. **Ship the key in the web build**: add `VITE_APPCHECK_SITE_KEY=<site key>` to `.env.production`
   (and the test key to `.env.test`). It's a public key; committing it is fine. Build and deploy hosting.
4. **Watch for a day**: Firebase console → App Check → APIs → Cloud Functions shows verified vs unverified
   requests. Wait until nearly all are verified (old cached tabs age out).
5. **Enforce**: set `"appCheck": true` in `functions/features.json` (or only in
   `functions/features.kindflames-test.json` to try it on test first) and deploy functions.

Local dev with App Check on: set `VITE_APPCHECK_DEBUG_TOKEN=true` in `.env`, load the site, copy the debug token
the browser console prints, and add it under App Check → Apps → ⋮ → Manage debug tokens.

The checkout callables (`createStripeCheckout`, `createPayPalOrder`, `capturePayPalOrder`, `verifyStripePayment`)
don't enforce App Check yet, because another change is in flight on them. To add it, spread `PUBLIC_CALL` into their
options, e.g. `onCall({ ...PUBLIC_CALL, secrets: STRIPE_SECRETS }, …)`.

## Housekeeping

- **Rate-limit docs** live in `rateLimits/` (server-only; keyed by a hash, so no raw emails or IPs). Each has an
  `expireAt`. To have Firestore delete old ones automatically: Firestore → TTL policies → Create → collection group
  `rateLimits`, field `expireAt`.
- **Limits** are constants in `functions/index.js` (`throttle(...)` calls). Raise them there if a real customer
  ever hits one; the error they see is "Too many requests. Please try again in a little while."

## Deploy order

Order matters: the new rules block the old site's direct newsletter write, so the `subscribeNewsletter` callable
and the new hosting bundle must be live before the rules.

1. Test: `firebase deploy -P test --only functions`, then `npm run deploy:test:hosting`, then
   `firebase deploy -P test --only firestore:rules`. Try: newsletter signup from the footer, a review from a
   signed-in account (and confirm a guest can't), notify-me on a sold-out size, a partial refund in the PayPal
   sandbox, and cancelling a paid order (should be refused).
2. Prod: the same three steps with `-P prod` (hosting via `npm run build && firebase deploy -P prod --only hosting`).
