// Runs inside `firebase emulators:exec --only functions,firestore`. Exercises the newsletter trigger and unsubscribe endpoint.
//   npx -y firebase-tools@15 emulators:exec --project shamyra-web --only functions,firestore "node functions/scripts/test-marketing.mjs"
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ projectId: 'shamyra-web' });
const db = getFirestore();
const FN = 'http://127.0.0.1:5001/shamyra-web/us-central1';
let fails = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, tries = 40) => { for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return v; await sleep(250); } return null; };

await db.doc('discounts/WELCOME10').set({ type: 'percent', value: 10, active: true, firstOrderOnly: true, appliesTo: 'all' });

// 1. Newsletter signup → marketing doc at welcome stage 1 with a token
const email = `test-${Date.now()}@example.com`;
await db.doc(`newsletter/${email}`).set({ email, source: 'home', createdAt: new Date() });
const m = await waitFor(async () => { const s = await db.doc(`marketing/${email}`).get(); return s.exists && s.data().welcomeStage === 1 ? s.data() : null; });
check('signup creates marketing contact at stage 1', !!m, true);
check('contact source is newsletter', m?.source, 'newsletter');
check('contact has a token', typeof m?.token === 'string' && m.token.length === 32, true);
check('contact starts subscribed', m?.unsubscribed, false);

// 2. Unsubscribe with a wrong token is rejected, right token flips the flag
const bad = await fetch(`${FN}/unsubscribe?e=${encodeURIComponent(email)}&t=nope`);
check('wrong token → 400', bad.status, 400);
const good = await fetch(`${FN}/unsubscribe?e=${encodeURIComponent(email)}&t=${m.token}`);
check('right token → 200', good.status, 200);
check('page says unsubscribed', (await good.text()).includes("You're unsubscribed"), true);
check('flag set in Firestore', (await db.doc(`marketing/${email}`).get()).data().unsubscribed, true);
const again = await fetch(`${FN}/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ e: email, t: m.token }) });
check('one-click POST is idempotent → 200', again.status, 200);
check('missing params → 400', (await fetch(`${FN}/unsubscribe`)).status, 400);
check('wrong method → 405', (await fetch(`${FN}/unsubscribe`, { method: 'DELETE' })).status, 405);

// 3. A second signup for the same (unsubscribed) address must not resubscribe or resend
await db.doc(`newsletter/${email}`).delete();
await db.doc(`newsletter/${email}`).set({ email, source: 'home', createdAt: new Date() });
await sleep(1500);
check('re-signup keeps unsubscribed', (await db.doc(`marketing/${email}`).get()).data().unsubscribed, true);

console.log(fails ? `MARKETING EMULATOR TESTS: ${fails} failed` : 'MARKETING EMULATOR TESTS: all passed');
process.exit(fails ? 1 : 0);
