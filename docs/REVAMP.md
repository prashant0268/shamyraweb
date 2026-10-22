# Storefront revamp (Oct 2026): teardown of 10 candle sites, what we adopted, and the theme system

## 1. What the top candle sites have in common

Sites reviewed: Diptyque, NEST New York, Voluspa, Boy Smells, Homesick, Otherland, Brooklyn Candle Studio, LAFCO, Antique Candle Co., Paddywax. (NEST, Voluspa and Paddywax render client-side and were only partly readable; LAFCO was checked in a browser.)

| Pattern | Who does it | What we built |
|---|---|---|
| Rotating announcement bar: free-shipping threshold + promo + guarantee | Boy Smells, Otherland, Brooklyn Candle, Antique Candle, LAFCO | `AnnouncementBar` rotates the lines set in Admin → Settings → Homepage |
| Uppercase, tracked nav with a mega menu; "shop by scent family" with ingredient photos; gifts by budget/occasion | Otherland, Brooklyn Candle, Voluspa, Diptyque, NEST | `Navbar` mega menus for Shop (by product, by scent, collections + two photo tiles) and Gifts (by budget, by occasion) |
| Full-bleed lifestyle hero with one headline and one or two CTAs | Everyone | Hero with a theme-specific photo and gradient overlay |
| Category tiles as photos, not colours | Brooklyn Candle, Paddywax, Homesick | Five photo tiles |
| Best-sellers rail with hover image swap and quick add | Homesick, Otherland, Diptyque, Brooklyn Candle | `Rail` + `ProductCard` (hover second image, Quick add on hover, Add on mobile) |
| Scent family tiles | Otherland, Brooklyn Candle, Voluspa | Seven round tiles → `/shop?family=…` |
| Brand story + values icon strip (soy, phthalate-free, vegan, made in…) | Brooklyn Candle, Antique Candle, Otherland, Homesick | Story block with two photos + four value cards; icon `ValueStrip` lower down |
| Bundle / build-your-own band | Otherland, Brooklyn Candle, Boy Smells | Spa-set band |
| Customer quotes | Homesick, Antique Candle, Brooklyn Candle | Shows only real approved reviews (section hides until there are some) |
| Subscription banner | Brooklyn Candle, Antique Candle, Voluspa | Candle of the Month card |
| Footer with inline newsletter, link groups, social, payment marks | Homesick, Otherland, Paddywax, LAFCO | New footer |
| First-visit popup: photo left, "X% off" right, Yes/No buttons | LAFCO (15%), Paddywax, Voluspa, NEST (from memory) | `WelcomePopup`: 6 s delay or exit intent, once per 30 days, never on checkout, writes `newsletter/{email}` so the welcome series starts |
| PDP: thumbnail gallery, size cards with savings, top/heart/base, spec icons, accordions, sticky add-to-cart, "pairs well with", "you may also like" | Brooklyn Candle, Otherland, Boy Smells, Antique Candle, Homesick | All of it; sizes show $/oz and a "Best value" chip |
| Cart drawer: free-shipping progress, upsells, empty-state suggestions | Homesick, Brooklyn Candle | "Complete the set" rows (same scent family) |

Dropped or demoted: solid-colour category tiles, emoji icons, "Corporate" in the primary nav (none of the ten put B2B in the main bar; it lives under Gifts and in the footer), the product-photo hero, the sidebar filter panel on the shop page (replaced with pills, like Otherland/Brooklyn Candle), and the "Kind Flames" text next to the logo (the lockup carries the wordmark).

Things they do that we deliberately skipped for now: scent quiz, loyalty points, subscribe-and-save on single products, licensed collabs, retail-store blocks, AI review summaries. Candidates for later.

## 2. Themes

Five looks, switchable in Admin → Settings → Appearance. Every theme redefines the same tokens, so pages never know which is active.

| Theme | Mood | Type | Corners | Borrowed from |
|---|---|---|---|---|
| **Hearth** (default) | cream, pine, honey | Fraunces + Karla | round | Brooklyn Candle, Antique Candle |
| **Atelier** | gallery white, black | Cormorant Garamond + Inter, uppercase nav | square | Diptyque, Boy Smells |
| **Noir** | near-black, cream, gold | Playfair Display + Jost | 2 px | LAFCO, NEST |
| **Sunroom** | warm white, terracotta, teal | DM Serif Display + DM Sans | very round | Otherland, Homesick, Paddywax |
| **Apothecary** | pale sage, olive, clay | Lora + Nunito Sans | soft | Brooklyn Candle, Voluspa |

- Preview any theme on the live site with `?theme=hearth|atelier|noir|sunroom|apothecary` (sticks for the tab; `?theme=reset` exits). A small "Previewing theme" chip shows while previewing.
- Switching for everyone: Admin → Settings → Appearance → pick → Save. The choice is cached in the browser so the right colours paint before React loads.
- Admin screens always use the default theme.
- Where it lives: tokens in `src/index.css` (`[data-theme="…"]` blocks), catalogue + fonts in `src/themes.ts`, resolution in `src/context/ThemeContext.tsx`. Adding a theme = one CSS block + one entry in `THEMES`.
- Screenshots of every theme: `node scripts/theme-shots.mjs http://127.0.0.1:4173 <outDir>` against `vite preview`.

## 3. Imagery

All editorial photos and, for now, product photos come from Unsplash's CDN (`src/data/imagery.ts`; Unsplash License, free for commercial use). The catalog's own product photos don't match their SKUs, so **Admin → Settings → Appearance → "Use placeholder product photos"** is on by default. When the Gemini renders are uploaded, turn it off and the real photos take over everywhere (cards, galleries, cart). Editorial imagery stays unless replaced in `imagery.ts`.

## 4. Settings added (`settings/store`)

`theme`, `placeholderImages`, `announcement.messages[]`, `popup { enabled, headline, body, code, delaySeconds }`, `social { instagram, facebook, tiktok, pinterest }`. All have defaults in `CatalogContext.DEFAULT_SETTINGS`; nothing needs seeding.

## 5. Checks

`npm run build`, `node scripts/smoke.mjs` (desktop + mobile, no console errors, no horizontal overflow) and `scripts/theme-shots.mjs` all pass. The popup is suppressed in the smoke test via `kf_popup_seen`; test it by hand with `/?popup=on`.
