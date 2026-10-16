# Kind Flames — task list

Living tracker. Update the status column as work lands. "Owner" is who does it: **dev** = Claude builds and deploys, **you** = needs Prashant (accounts, content, decisions).

Status: `todo` · `in progress` · `review` (deployed, awaiting your check) · `done` · `blocked`

## Done (Oct 2026 rebuild)

Catalog in Firestore with 5 categories · product detail pages · search/filter · bundle builder (15% off) · discount codes · gift wrap + message · server-side pricing, tax (NJ) and shipping · PayPal live · Stripe live (cards + subscriptions) · admin (products, orders, discounts, reviews, newsletter, quotes, subscriptions, settings) · corporate quote flow with CSV recipients, gift-code inserts and Stripe invoices · transactional email via Resend (confirmation, owner alert, shipped, delivered/review request, abandoned bag, subscription welcome, quote receipt) · GA4 e-commerce events · sitemap/robots/meta · mobile layout · smoke tests · pricing unit + emulator tests.

## Now — Q4 gifting (target: live by Nov 1)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Real product photos (one lifestyle shot per candle, group shot per set) | you | todo | Upload via Admin → Products. Biggest conversion lever. |
| 2 | Enable Apple Pay, Google Pay, Link (and Klarna/Affirm) in Stripe → Settings → Payment methods | you | todo | Checkout picks them up automatically. |
| 3 | Holiday gift guide page `/gifts` (by recipient and budget, bundle builder CTA) | dev | todo | Parallel-safe: new page + nav link. |
| 4 | Google Merchant Center product feed (`/feed.xml` generated at build) + site verification | dev / you | review | Built on branch `claude/jovial-carson-c75be3` (46 items). You: verify the site (paste the token into `index.html`), add the scheduled fetch of `https://kindflames.com/feed.xml`, set shipping/returns/tax in Merchant Center. See HANDOFF → Google Merchant Center. |
| 5 | Meta Pixel + Conversions API alongside GA4 events | dev / you | review | Pixel built (same branch as #4): set `VITE_META_PIXEL_ID` in `.env.production` and deploy. **Follow-up:** Conversions API (server side, dedupe via the `purchase:<order>` eventID already sent) not done in this pass. |
| 6 | Per-product JSON-LD (Product, Offer, AggregateRating) on product pages | dev | todo | Parallel-safe: ProductDetail only. |
| 7 | Corporate sample kit SKU ($25, credited on first bulk order) | dev | todo | Parallel-safe: catalog + corporate page. Goes with #6. |
| 8 | Chrome cache / disk cleanup so builds and deploys keep working | you | done | 9 GB free as of Oct 15. |

## Next — repeat purchases

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 9 | Marketing email: sync newsletter + customers to Resend Audiences; welcome series, post-purchase care tips, 45-day reorder nudge | dev | todo | Touches functions/index.js — runs in the main session, sequential with #10–12. |
| 10 | Referral codes: share link = 10% for a friend, $5 credit for the referrer | dev | todo | functions + checkout + account. |
| 11 | Weekly owner digest (sales, top products, recovered carts) + low-stock alerts | dev | todo | functions scheduler. |
| 12 | Stripe webhook enabled (`STRIPE_WEBHOOK_SECRET` + `features.json`) | dev / you | todo | You create the endpoint in Stripe; dev flips the flag and deploys. |
| 13 | WELCOME10 discount created in Admin → Discounts | you | todo | The signup banner promises it. |

## Later — operations and SEO

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 14 | Shipping labels from admin (Shippo or EasyPost): "Mark shipped" buys USPS label, fills tracking | dev / you | todo | You open the carrier account; dev integrates. |
| 15 | Pre-render product and guide pages to static HTML at build (SEO, link previews) | dev | todo | Parallel-safe: build script only. |
| 16 | Error monitoring (Sentry) on site and functions | dev / you | todo | You create the Sentry project; dev wires the DSN. |
| 17 | Content: scent guides, candle care, gifting guides (`/guides`) | dev / you | todo | Dev builds the pages; you supply or approve copy. |
| 18 | Loyalty points | dev | todo | After referrals prove out. |
| 19 | Git history purge of the 90 MB original images | dev | blocked | Needs your explicit go-ahead; rewrites main. |

## Housekeeping

| # | Task | Owner | Status |
|---|------|-------|--------|
| 20 | Delete test quotes "Kind Flames (email test 1–4)" in Admin → Corporate quotes | you | todo |
| 21 | Delete unpaid test orders KF-1001, KF-1002 from their order pages | you | todo |
| 22 | One real card order + refund to prove the live Stripe path | you | todo |
