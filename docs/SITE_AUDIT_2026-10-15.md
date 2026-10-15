# Kind Flames / Shamyra — Site Audit & Roadmap (2026‑10‑15)

## 0. TL;DR

* **Two divergent versions of the site exist.** The code that is actually live on kindflames.com lives as ~800 lines of *uncommitted* changes in `/Users/prashant/Projects/shamyraweb` (main checkout, Dec 2025–Mar 2026). The version in git `main` (commit `22604d5`, Apr 2026, from this worktree) is a *different* Stripe implementation that was never deployed and calls a Cloud Function that doesn't exist. Reconciling these is job #1.
* **Live site today = PayPal only.** Stripe is hidden on production (`!isProduction`). Stripe orders that *are* placed (non‑prod) are saved as `pending` and never marked paid — there is no webhook or verify call.
* **Security holes:** both versions trust client‑supplied prices; the deployed Firestore rules let a user mark their own order `paymentStatus: completed`.
* **No admin side at all.** Products are a hard‑coded TS array; there is no way to add products, change order status, see all orders, or email customers without editing code and redeploying.
* **Mobile:** layout is responsive, but product images are 1–9 MB PNGs each (home page loads ~11 of them → tens of MB). This alone will kill mobile conversion.
* **SEO/brand:** page title is `shamyraweb`, favicon is the Vite logo, no meta/OG tags, and the brand is "Shamyra" in git vs "Kind Flames" on the live site.

---

## 1. What exists today

### 1a. Git `main` / this worktree (`claude/cranky-colden`, commit 22604d5)
| Area | Status |
|---|---|
| Catalog | 12 hard‑coded candles in `src/data/products.ts`, Unsplash placeholder images (3 images reused across 12 products) |
| Cart | Works (localStorage for guests, Firestore for logged‑in; merges on login) |
| Auth | Email/password, password reset + `/auth/action` handler (good) |
| Checkout | Requires login. Shipping form → tabs: PayPal (client‑side `actions.order.create`) / Card (Stripe Elements → `createStripePaymentIntent`) |
| Cloud Function | `functions/index.js` = v1 `onRequest` `createStripePaymentIntent` using `functions.config()` (deprecated API; backing service was scheduled for shutdown end‑2025). **Not deployed.** |
| Orders | Saved to Firestore `orders`, shown on Profile. Status never changes from `pending`. |
| Footer | Placeholder contact info (`info@shamyra.com`, `(555) 123‑4567`, `123 Candle Lane`) |
| Home | "Image Placeholder" box in About section |

### 1b. Main checkout (uncommitted, **this is what's deployed**)
| Area | Status |
|---|---|
| Brand | Renamed to **Kind Flames**; real phone `(732) 666‑8013`, `info@kindflames.com` |
| Catalog | Same 12 candles, local PNG images, `fragrance`, `isNewArrival`, `collections: ['christmas']` fields; Home has Featured / New Arrivals / Christmas sections + background image |
| Products page | Nicer filter pills with counts, "Showing N products" |
| Auth | Adds Google sign‑in + **anonymous guest checkout** (needs providers enabled in Firebase console — unverified) |
| Checkout | Radio choice PayPal / Card. PayPal → server `createPayPalOrder` + `capturePayPalOrder` (v2 callable, PayPal server SDK, sandbox/live switch via `PAYPAL_MODE` secret). Card → `createStripeCheckout` (Stripe Checkout Session, redirect) — **hidden on kindflames.com** |
| Cloud Functions (deployed, us‑central1, Node 20, v2 callable) | `createStripeCheckout`, `verifyStripePayment`, `createPayPalOrder`, `capturePayPalOrder` |
| Order confirmation | `/order-confirmation` page exists but shows stale copy: *"Payment will be processed separately… we'll contact you with payment details"* |
| Firestore rules | Users may `update` their own order's `paymentStatus/paidAt/stripeSessionId/paypalOrderId` |
| Extras | `/internal/prints/flyer`, `/internal/prints/flyer2`, `/internal/font-preview` (public routes, no auth) |
| Hosting | Last release 2026‑03‑14; local `dist/` built 2025‑12‑29 and references the callable function names above |

---

## 2. What's broken / risky (ranked)

### P0 — must fix before spending on marketing
1. **Code divergence.** Commit the main‑checkout work, merge it with the worktree's password‑reset/AuthAction work, pick ONE Stripe approach (recommend: deployed Checkout‑Session flow + webhook), delete the other. Right now `npm run deploy` from `main` would ship a Stripe button that 404s.
2. **Stripe orders never complete.** Deployed flow writes a `pending` order *before* redirecting and nothing ever flips it to paid. Need a `stripe.webhooks` (`checkout.session.completed`) function that updates the order, or call `verifyStripePayment` on `/order-confirmation?session_id=…`. Webhook is the right answer (survives closed tabs).
3. **Price tampering.** `createStripeCheckout` builds line items from `item.price` sent by the browser; `createPayPalOrder` uses client `total`. Anyone can buy a $29.99 candle for $0.01. Server must look prices up (Firestore `products`) by id.
4. **Firestore rule lets buyers self‑mark orders paid.** Only Cloud Functions (Admin SDK) should write `paymentStatus`. Set `allow update: if false` for clients.
5. **Stale confirmation copy** ("payment will be processed separately") — customers will think they haven't paid.
6. **No sales tax, no shipping cost.** "FREE" shipping is hard‑coded and no tax is collected; candles/lotions are heavy/liquid — this is a margin and compliance problem. Use Stripe Tax (or TaxJar) + flat/zone shipping rates.
7. **Image weight.** `candle1‑5.png` are 6.7–8.8 MB each, `img1‑7.png` 1.7–4.2 MB. Convert to WebP/AVIF ≤150 KB, serve responsive sizes, lazy‑load. (Vite build warns the JS bundle is 820 KB too — code‑split Firebase/PayPal/Stripe.)

### P1 — before "real launch"
8. No order/shipping confirmation emails (customer or owner). Firebase "Trigger Email" extension or Resend + a Firestore `onCreate` trigger.
9. No product detail page (no scent notes, burn time, size, wax type, ingredients) — every competitor has one; also needed for SEO and for skincare ingredient disclosure.
10. SEO/meta: `<title>shamyraweb</title>`, Vite favicon, no description/OG/Twitter cards, no `robots.txt`/`sitemap.xml`, SPA with no prerender. Add react‑helmet or a static prerender step; set real favicon (logo PNG already exists in assets).
11. Brand inconsistency: "Shamyra" (git) vs "Kind Flames" (live) vs "KindFlames" (PayPal description). Pick one everywhere, incl. `package.json` name, email sender, PayPal/Stripe statement descriptor.
12. Legal pages missing: Privacy, Terms, Shipping & Returns, Contact. Stripe/PayPal dispute handling and MoCRA/FDA cosmetic labeling will need these.
13. `AuthProvider` renders nothing until Firebase auth resolves → blank white page on first load (bad LCP, looks broken on slow mobile). Render app with a skeleton instead.
14. Cart stores full product snapshot incl. price → stale prices after edits; store `{productId, qty}` and hydrate.
15. `/internal/*` routes are public; gate behind admin or remove from prod build.
16. Mixed styling (styled‑components in Navbar/Footer/Card, Tailwind everywhere else). Not urgent, but pick one before building an admin UI.

### P2 — quality
17. No 404 route, no loading/skeleton states, no error boundary.
18. Category filter resets on navigation; no URL state (`/products?category=soy`) → not shareable/indexable.
19. Order history: no tracking number, no per‑item images, status badge always yellow.
20. `functions.config()` in the worktree function is deprecated — moot once reconciled.

---

## 3. Admin side — currently none

What "admin" needs to mean for a 1‑2 person brand:
* **Products**: CRUD, multiple images (Firebase Storage), variants (size: 4 oz / 8 oz / 12 oz; scent), category + collection tags, inventory count, active/draft, SEO slug. Move catalog from `products.ts` to Firestore `products` (rules already stubbed).
* **Orders**: list/filter all orders, detail view, status workflow (`pending → paid → fulfilled → shipped → delivered / refunded`), tracking number + carrier, print packing slip, refund via Stripe/PayPal API, export CSV.
* **Customers**: list, order count, LTV, notes.
* **Discounts**: code, %/fixed, min order, expiry, usage limit.
* **Content**: homepage hero/collections toggles (e.g. "Christmas Collection" on/off), announcement bar, FAQ.
* **Auth**: `admin: true` custom claim set via a one‑off script; rules check `request.auth.token.admin == true`.

Build estimate (custom React + Firestore): ~2–3 focused weeks for products + orders + discounts; emails and refunds ~1 more week.

---

## 4. Mobile friendliness

* Layout: Tailwind responsive grids (1→2→3→4 cols), stacked checkout, sticky navbar — structurally fine. Navbar has no hamburger but only two text links, so it fits at 375 px. Adding Corporate/Bath & Body/About links will overflow → needs a drawer menu.
* Performance (the real problem): multi‑MB PNGs, 820 KB JS, Google Fonts loading 10 families (deployed `index.html`), blank screen until auth resolves. Expect Lighthouse mobile performance well under 50. Fontana Candle Co.'s redesign case study attributes an 11.3 % conversion lift largely to speed/mobile nav fixes.
* Missing mobile niceties: sticky "Add to cart" on product page, tap‑target sizes on cart +/– buttons (currently ~24 px; aim 44 px), bottom‑sheet cart.

---

## 5. Market snapshot

**Size & direction**
* Global scented‑candle market ≈ **$4.1 B (2026) → $6.4 B (2036), ~4.5 % CAGR**; US is the largest share (Future Market Insights). Broader candle market ≈ $21 B (2025) (Global Market Insights).
* Online is ~34 % of candle sales but the **fastest‑growing channel (~8 % CAGR)**, driven by gifting and subscriptions.
* Consumer shift to soy / coconut / beeswax, "clean" fragrance, aromatherapy positioning, premiumisation.

**How you compare (feature parity with DTC candle brands)**
| Feature | P.F. Candle / Homesick / Otherland / Boy Smells / Brooklyn Candle | Kind Flames today |
|---|---|---|
| Product detail page w/ scent notes, burn time, size | ✅ | ❌ |
| Multiple photos + lifestyle shots | ✅ | ❌ (1 heavy PNG) |
| Reviews / UGC | ✅ | ❌ |
| Bundles / gift sets / build‑your‑own | ✅ | ❌ |
| Subscription | Keap, Nest ($40/mo), Magnolia ($96/qtr) | ❌ |
| Corporate / bulk program | Homesick (min 48 custom), Sweetwater Decor (min 70, $95 design fee) | ❌ |
| Email capture + flows | ✅ (Klaviyo) | ❌ |
| Guest checkout, Apple/Google Pay | ✅ | Guest ✅ (live), wallets ❌ |
| Free‑shipping threshold | typically $50–$75 | free on everything |

Typical price ladder for artisan soy candles: ~$18–$28 (4–6 oz), $28–$45 (8–10 oz), $55+ (3‑wick/luxury). Your $19–$30 sits in value‑premium — fine, but it needs the storytelling (wax, wick, pour, scent families) that justifies it.

**Corporate gifting (your explicit ask)**
* Can be material: Caftari reported ~25 % of H1‑2024 revenue from corporate orders (Modern Retail).
* Homesick cut custom‑bulk minimum from 1,200 → 48 units to open the SMB segment; it was acquired by K Hall Studio in Feb 2026.
* Known pain: recipients are anonymous to the brand → add a QR insert / discount card to convert gift recipients.
* Seasonality: Q4 is dominant; vendor pages claim ~30 % order jumps in October (unverified). Plan the program to be live by **early September**.

**Bath & body expansion (scrubs, lotions, bath salts)**
* Luxury bath/body gift sets sell from <$25 to >$100; both "duo" sets and 10–15‑piece sets move — bundles are the format.
* Handmade bundle archetype: body butter + sugar scrub + bath salts (+ soap/oil). Candle + bath‑salt "spa night" set is the obvious cross‑sell.
* Compliance: US cosmetics need FDA‑style labeling (INCI ingredient list, net weight, warnings) and MoCRA facility registration/product listing unless you qualify for the small‑business exemption — check thresholds. Candles need ASTM F2058 warning labels. Scrubs/lotions are liquids → leak‑proof packaging, heat‑sensitive summer shipping.

---

## 6. What to add — prioritised roadmap

### Phase 0 — Stabilise (1 week)
1. Reconcile repos (see P0‑1). Commit, tag `v1.0.3-live` so you can always rebuild what's deployed.
2. Stripe webhook + server‑side pricing + locked rules. Enable Stripe on prod once the Stripe account is activated.
3. Fix confirmation copy; send order emails (customer + you).
4. Compress images; set title/favicon/meta; brand name everywhere = Kind Flames.
5. Add tax + shipping (Stripe Tax; flat $6.95 / free over $60 or similar).
6. Policy pages + contact page.

### Phase 1 — Multi‑category store + admin (3–4 weeks)
7. Firestore product catalog with **categories: Candles, Body Scrubs, Lotions, Bath Salts, Gift Sets** and per‑category attributes (burn time / wax / wick vs. ingredients / size / skin type).
8. Product detail pages with gallery, scent family, pairings ("goes with…"), reviews placeholder.
9. Admin app (route `/admin`, custom‑claim gated): products, orders, discounts, customers.
10. Search + filter by scent family, price, collection; URL‑synced.
11. Navbar drawer for mobile with new categories; announcement bar.

### Phase 2 — Conversion & retention (2–3 weeks)
12. Bundles / "Build a Spa Set" builder with bundle pricing; gift wrap + gift message at checkout.
13. Discount codes, free‑shipping threshold bar, Apple Pay/Google Pay via Stripe.
14. Reviews with structured data (rich snippets), email capture (Klaviyo/Mailchimp, 10 % welcome offer), abandoned‑cart email.
15. GA4 e‑commerce events (measurementId already configured), Meta pixel.
16. Subscription option: "Candle of the Month" / "Spa Box" (Stripe Billing).

### Phase 3 — Corporate gifting program (2 weeks)
17. `/corporate` landing page: use cases (client gifts, employee appreciation, events/weddings), tiered pricing table (e.g. 25+/50+/100+ units at 10/15/20 % off), custom label / sleeve / card options, lead time.
18. Inquiry → quote flow: form (company, qty, budget, date, customisation, ship‑to: single vs. multi‑address) → Firestore `leads` + email to you → admin "Quotes" tab → convert to order → Stripe Invoice (card/ACH, Net‑30 for approved accounts).
19. Multi‑recipient shipping via CSV upload; branded insert + QR code with recipient discount to capture B2C customers.
20. Sample kit SKU ("Corporate sample box, $25, credited on first order").

### Build vs. buy (honest note)
Everything in Phases 1–2 is bundled into Shopify (~$39/mo + 2.9 % + 30¢) with apps for reviews, bundles, B2B. Staying custom on Firebase keeps fees lower and gives full control, but you're building admin, tax, discounts, emails and reviews yourself. With AI‑assisted dev it's feasible; just be aware that's the trade‑off you're choosing.

---

## 7. Sources
* [Scented Candle Market Outlook 2026‑2036 (FMI via ACCESS Newswire)](https://www.accessnewswire.com/newsroom/en/business-and-professional-services/scented-candle-market-outlook-2026-2036-global-industry-to-surpa-1139833)
* [Global Market Insights — Candle Market](https://www.gminsights.com/industry-analysis/candle-market)
* [45 Candle Industry Statistics in 2026 (Ringly)](https://www.ringly.io/discover/candle-industry-statistics-2026)
* [12 Best Candle Brands in 2026 (Ringly)](https://www.ringly.io/discover/best-candle-brands)
* [Luxury Candles Market (Persistence Market Research)](https://www.persistencemarketresearch.com/market-research/luxury-candles-market.asp)
* [How DTC brands optimized corporate gifting (Modern Retail, 2024)](https://www.modernretail.co/marketing/how-dtc-brands-have-optimized-their-corporate-gifting-programs/)
* [How Homesick is building its custom gifting program (Modern Retail, 2022)](https://www.modernretail.co/marketing/how-homesick-is-building-out-its-custom-gifting-program/)
* [Homesick — CB Insights (acquisition Feb 2026)](https://www.cbinsights.com/company/homesick)
* [Sweetwater Decor — custom candles minimums](https://www.sweetwaterdecor.com/pages/custom-candles)
* [Candle Delirium — corporate gifting](https://www.candledelirium.com/pages/corporate-gifting)
* [Prosperity Candle — corporate gifts](https://www.prosperitycandle.com/blogs/news/prosperity-candle-ideal-corporate-gift-that-gives-back)
* [20 Best Candle Subscription Boxes (MSA)](https://mysubscriptionaddiction.com/candle-subscription-boxes)
* [Magnolia candle subscriptions (Subscription Insider)](https://www.subscriptioninsider.com/topics/product-development/chip-and-joanna-gaines-launch-magnolia-candle-subscriptions)
* [Candle store landing page that converts (GemPages)](https://gempages.net/blogs/shopify/candle-store-landing-page)
* [Fontana Candle Co. CRO case study (Splitbase)](https://splitbase.com/case-studies/fontana)
* [Shopify Candle SEO 2026 (Launchtip)](https://www.launchtip.com/blog/shopify-candle-seo-keywords-scents-and-product-tips-that-rank)
* [Best luxury bath & body gift sets 2026 (Mayfair Farms)](https://www.mayfairfarms.com/best-luxury-bath-and-body-gift-sets/)
