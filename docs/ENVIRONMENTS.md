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
| Stripe | live keys | **test** keys (`sk_test_…`) |
| PayPal | live (`PAYPAL_MODE=live`) | sandbox only, cannot go live |
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
  + `EXTRA_ORIGINS` + the Vite localhost ports. `PRODUCTION_HOSTS` (the only origins allowed to use live PayPal)
  is derived from `SITE_URL` when `IS_PRODUCTION=true` and is empty otherwise. `PAYPAL_MODE` (a secret) defaults
  to `sandbox` unless `IS_PRODUCTION`. Code defaults equal the old hardcoded production values, so production
  behaves exactly as before even if an env file were missing.
- **Secrets** never live in files: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET`, `PAYPAL_CLIENT_ID_LIVE`, `PAYPAL_CLIENT_SECRET_LIVE`, `PAYPAL_MODE`, `RESEND_API_KEY`
  are Secret Manager secrets, set once per project.

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

Run from the repo root (each prompts for the value, or pipe it in). Use **Stripe test mode** keys and **PayPal
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
firebase functions:secrets:set PAYPAL_MODE -P test
```
(`sandbox`)
```bash
firebase functions:secrets:set RESEND_API_KEY -P test
```
Resend: either reuse the production key (emails will really send, so `ADMIN_EMAILS`/`OWNER_EMAIL` are the only
recipients that matter during tests) or create a second Resend API key for the test project.

Stripe webhook (only when `features.json` → `stripeWebhook` is on): in Stripe **test mode** → Developers →
Webhooks → Add endpoint `https://us-central1-kindflames-test.cloudfunctions.net/stripeWebhook`, event
`checkout.session.completed`, then `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET -P test`.

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

Until the test project exists, `.env` can hold the production web config for `npm run dev` (that is what the
hardcoded config used to do); with `VITE_ENV` unset the dev server still uses sandbox PayPal and shows the
"LOCAL DEV" chip.
