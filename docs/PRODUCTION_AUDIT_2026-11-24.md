# Production-readiness audit — Nov 24 2026

Scope: code in this repo plus the live site (kindflames.com, project `shamyra-web`). Read-only review in three tracks: security and backend, frontend/SEO/performance/accessibility, commerce operations and compliance. Items marked **verified** were re-checked by hand after the review.

Owner = only Prashant can do it (accounts, legal, money). Code = dev work.

**Status (2026-11-26):** all Code items are fixed and deployed to production (kindflames.com) and test. Remaining open items are the Owner ones (checklist below, also in `docs/HANDOFF.md`).

## P0: fix now (money, security, broken access)

| # | Finding | Evidence | Fix | Who |
|---|---|---|---|---|
| 1 | **Orders can be marked paid with fake PayPal sandbox money.** The server picks PayPal live vs sandbox from an `origin` value the browser sends, and `localhost` origins are allowed on prod. A request claiming a localhost origin runs on sandbox; a free sandbox buyer approves it and the real order is marked paid, emailed and stock decremented. **Verified.** | `functions/index.js:55-66, 160-166, 245-252, 257, 293` | On prod always use live PayPal regardless of origin; drop localhost origins when `IS_PRODUCTION`; store the PayPal environment on the order; on capture require `captures[0].status === "COMPLETED"` and amount/currency equal to the order total. Audit existing PayPal orders whose `origin` is a localhost URL. | Code |
| 2 | **Paid orders can be lost.** Prod Stripe webhook is off; card orders are only marked paid when the browser returns to the confirmation page. PayPal has no webhook either. A closed tab means no receipt, no stock change, an "abandoned bag" email to a paying customer, and a "Delete unpaid order" button in admin. | `functions/features.json` (`stripeWebhook:false`), `index.js:215-228, 286-299, 557-564` | Owner: create live Stripe webhook + `STRIPE_WEBHOOK_SECRET` on prod. Code: enable `features.shamyra-web.json`, handle `async_payment_succeeded`, disputes and refunds; add a PayPal capture webhook or a scheduled reconciler that checks pending orders with Stripe/PayPal before reminders or deletion. | Both |
| 3 | **https://www.kindflames.com shows a certificate error.** **Verified.** | `curl https://www.kindflames.com` → "no alternative certificate subject name" | Firebase Hosting → Add custom domain `www.kindflames.com` → redirect to apex. | Owner |
| 4 | **Anyone can post a pre-approved review with any rating.** Rules only check `userId`; guests are signed in anonymously. The rating trigger then writes the distorted average. **Verified.** | `firestore.rules:47-51`, `index.js:353-362` | Validate fields in rules (`approved == false`, rating int 1–5, length limits, no anonymous), clamp in trigger. | Code |
| 5 | **The site can be used to email arbitrary addresses.** `newsletter/{email}` create is open to anyone and triggers welcome emails; `submitQuote` has no auth or rate limit and emails a confirmation to any address. Spam complaints would suspend Resend, which also stops order receipts. **Verified (rules).** | `firestore.rules:53-56`, `index.js:381-399` | Move signup behind a callable with App Check + throttling (or double opt-in); App Check + throttle on `submitQuote`; enforce App Check on all callables. | Code |
| 6 | **No backups.** PITR disabled, delete protection off, no backup schedule on the prod database. | `firestore:databases:get` | Enable PITR + delete protection; daily backup schedule. | Owner (console) |

## P1: before scaling traffic

- **Compliance**
  - No consent banner; GA4 fires on first load, Meta Pixel would too. Add Consent Mode v2 (default denied), gate the pixel, honour GPC. (`src/config/firebase.ts:35`, `src/main.tsx:9`)
  - CAN-SPAM: email footer has no postal address; abandoned-bag email has no unsubscribe. (`index.js:564, 595`) Owner picks a mailing address; code adds it and the unsubscribe.
  - Every review shows "Verified" with no purchase check, which conflicts with the FTC fake-reviews rule. (`ProductDetail.tsx:170`)
  - Privacy policy missing targeted-ads opt-out (CCPA/NJ), GPC, retention; no subscription auto-renewal terms; `/accessibility` renders 404 content. Owner: legal review; confirm "MoCRA-registered" and ASTM label claims.
- **Product photos are stock images of other products** (`placeholderImages` default true). Misrepresentation risk, also flows into Merchant Center/Meta feeds. Owner: upload Gemini renders, then turn placeholders off.
- **Discount abuse:** `firstOrderOnly` is checked per uid and every guest gets a new anonymous uid, so WELCOME10 is reusable without limit; `usageLimit` races. (`pricing.js:68`, `index.js:81, 153`) Check by email, reserve usage in a transaction.
- **Inventory:** stock is checked at quote time and decremented after payment outside a transaction, floored at 0; no restock on refund/cancel; no low-stock alert. (`pricing.js:30`, `index.js:140-151`)
- **Refunds:** full only, no customer email, no restock; paid orders can be set `cancelled` without a refund. (`index.js:317, 333-350`)
- **Tax:** subscriptions and Stripe invoices collect no sales tax. (`index.js:401, 440-448`) Use Stripe Tax `automatic_tax` or add the NJ line.
- **Subscriptions:** fulfilment orders are created from stale status (no subscription webhook), so cancelled/past-due subscribers can be shipped. (`index.js:518-551`)
- **Guest order lookup:** confirmation email links to `/account`, which a guest on another device can't use. Add lookup by order number + email.
- **Monitoring:** no Sentry, no uptime check, no alert on function errors; many failures are `console.error` or silently swallowed. Add Sentry, a Cloud Monitoring uptime check and error-rate alerts to the owner.
- **Admin claim:** `ensureAdmin` doesn't require `email_verified`. Require it (and preferably Google sign-in). (`index.js:302-312`)
- **Quote alert email HTML injection:** most fields unescaped in the owner email. (`index.js:394`)

## P2: SEO, performance, accessibility

- **SEO:** every URL serves identical HTML with canonical and `og:url` pointing at the homepage; product JSON-LD only after JS; social shares show the homepage card. Prerender static and product routes at build. Unknown URLs return HTTP 200 (soft 404). **Verified.**
- **Performance (mobile, lab):** CLS 0.40 on /shop and 0.53 on product pages (poor ≥0.25) because the catalog loads after first paint; ~507 KB JS per page, PayPal chunk preloaded everywhere, storefront pages not code-split; product-page LCP 3.9 s on a 900 px Unsplash image; render-blocking Google Fonts. Seed the catalog from the bundle, lazy-load checkout/account/etc., srcset + preload hero, self-host fonts.
- **Accessibility:** no skip link; desktop search not keyboard-reachable; mega menu links unreachable by keyboard; cart drawer, popup and mobile menu don't trap or restore focus; 32 form labels not linked to inputs (`Bits.tsx:28`); contrast failures in Hearth muted text and focus ring, Sunroom and Apothecary buttons.
- **Security headers:** only HSTS (no `includeSubDomains`); add CSP, frame-ancestors, Referrer-Policy, Permissions-Policy, nosniff in `firebase.json`.
- **Resilience:** no React error boundary (a render error blanks the site); `index.html` cached 1 h can reference deleted chunks after a deploy, so use `no-cache` for HTML.
- **Mobile popup** within ~7 s full-width risks Google's intrusive-interstitial penalty; decline copy is confirmshaming.

## P3: engineering hygiene

- ESLint never checks `src/**/*.tsx`; 61 lint errors in `functions/`; no frontend tests; no CI. Add typescript-eslint and a CI job (tsc, lint, build, unit tests, smoke).
- `npm audit`: 4 high in root (grpc-js via firebase 12.4), 9 in functions (2 high). `npm audit fix` in functions; bump firebase to 12.19+.
- Duplicate GA `purchase` on confirmation reload; `shamyra-web.web.app` serves a duplicate site; `/shop/` redirects to `/`; sitemap has no `lastmod`; Merchant feed built from `catalog.json` instead of Firestore; a new Stripe coupon per discounted checkout; welcome email copy says "soy… cotton wicks" vs site's coconut-soy/wood wicks.

## Owner-only checklist

1. Add `www.kindflames.com` in Firebase Hosting (redirect to apex).
2. Firestore: enable PITR, delete protection, daily backups.
3. Create the live Stripe webhook and set `STRIPE_WEBHOOK_SECRET` on `shamyra-web`.
4. Pick a postal mailing address for emails.
5. Legal review of privacy, terms, returns, auto-renewal; confirm MoCRA and label claims.
6. DNS: add SPF for the mailbox provider at the root; add `rua=` to DMARC, later `p=quarantine`.
7. Upload real product photos, then turn placeholder photos off.
8. Stripe Radar + dispute alerts; PayPal dispute alerts.
9. Run the real card order + refund test (TASKS #22); delete test orders/quotes (TASKS #20–21).
10. Sentry account; decide whether the phone number stays public.

## Already fine

No secrets in git history; prices, tax and shipping computed server-side; US-only shipping enforced server-side; apex SSL valid; marketing unsubscribe works; TypeScript strict passes; admin bundle is split; immutable caching on hashed assets.
