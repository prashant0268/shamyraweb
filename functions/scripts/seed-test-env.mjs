// Seeds a fresh Firebase project (meant for the TEST project) with what the storefront needs on day one:
//   products/*        every product in src/data/catalog.json (never overwrites an existing product)
//   settings/store    DEFAULT_SETTINGS from functions/defaults.js (only when the doc is missing)
//   discounts/WELCOME10  10% off, first order only, active (only when missing)
//
// Dry run by default: prints what it WOULD write. Add --apply to write.
//
//   # via the Firebase CLI (uses your `firebase login` credentials; alias from .firebaserc)
//   npx -y firebase-tools@15 emulators:exec --project test --only functions \
//     "node functions/scripts/seed-test-env.mjs --apply"
//
//   # or with Application Default Credentials (gcloud auth application-default login / GOOGLE_APPLICATION_CREDENTIALS)
//   node functions/scripts/seed-test-env.mjs --project kindflames-test --apply
//
// Flags: --apply (write) · --project <id> (else GCLOUD_PROJECT from emulators:exec) · --force (overwrite
// settings/store and WELCOME10 too; products are still never overwritten) · --allow-prod (required to touch the
// project that .firebaserc calls "prod"; you almost never want this).

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const { DEFAULT_SETTINGS } = require("../defaults.js");

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const apply = flag("--apply");
const force = flag("--force");

// Talk to the real project, not an emulator, even when launched by `emulators:exec`.
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

const projectId = opt("--project") || process.env.GCLOUD_PROJECT || (() => { try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId; } catch { return undefined; } })();
if (!projectId) { console.error("No project: pass --project <id> or run via `firebase emulators:exec --project test ...`"); process.exit(2); }

let rc = {};
try { rc = JSON.parse(readFileSync(new URL("../../.firebaserc", import.meta.url), "utf8")).projects || {}; } catch { /* no .firebaserc: no prod guard possible */ }
if (rc.prod && projectId === rc.prod && !flag("--allow-prod")) {
  console.error(`Refusing to seed ${projectId}: .firebaserc says that is PRODUCTION. Pass --allow-prod if you really mean it.`);
  process.exit(2);
}

// Credentials: Application Default Credentials. `emulators:exec` exports your `firebase login` token for this; outside it,
// set GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login`.
initializeApp({ projectId });
const db = getFirestore();

const catalog = JSON.parse(readFileSync(new URL("../../src/data/catalog.json", import.meta.url), "utf8"));
console.log(`${apply ? "APPLY" : "DRY RUN"} against project ${projectId} (${catalog.length} products in catalog.json)\n`);

const plan = [];
const existing = new Set((await db.collection("products").get()).docs.map((d) => d.id));
const missing = catalog.filter((p) => !existing.has(p.id));
console.log(`products: ${existing.size} already in Firestore, ${missing.length} to add${missing.length ? ": " + missing.map((p) => p.id).join(", ") : ""}`);
for (const { id, ...data } of missing) plan.push({ ref: db.doc(`products/${id}`), data: { ...data, updatedAt: FieldValue.serverTimestamp() }, label: `products/${id}` });

const settingsSnap = await db.doc("settings/store").get();
if (!settingsSnap.exists || force) {
  console.log(`settings/store: ${settingsSnap.exists ? "overwrite (--force)" : "create"} with defaults`);
  plan.push({ ref: db.doc("settings/store"), data: { ...DEFAULT_SETTINGS, updatedAt: FieldValue.serverTimestamp() }, label: "settings/store" });
} else console.log("settings/store: exists, leaving as is");

const welcome = { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0, active: true, expiresAt: null, usageLimit: null, usageCount: 0, firstOrderOnly: true, appliesTo: "all", note: "Welcome offer promised by the signup banner (seeded by seed-test-env.mjs)" };
const welcomeSnap = await db.doc("discounts/WELCOME10").get();
if (!welcomeSnap.exists || force) {
  console.log(`discounts/WELCOME10: ${welcomeSnap.exists ? "overwrite (--force)" : "create"} (10% off, first order only, active)`);
  plan.push({ ref: db.doc("discounts/WELCOME10"), data: { ...welcome, createdAt: FieldValue.serverTimestamp() }, label: "discounts/WELCOME10" });
} else console.log("discounts/WELCOME10: exists, leaving as is");

if (!plan.length) { console.log("\nNothing to do."); process.exit(0); }
if (!apply) { console.log(`\n${plan.length} write(s) planned. Re-run with --apply to write them.`); process.exit(0); }

// Firestore batches cap at 500 writes; chunk to stay well under.
for (let i = 0; i < plan.length; i += 400) {
  const batch = db.batch();
  for (const w of plan.slice(i, i + 400)) batch.set(w.ref, w.data);
  await batch.commit();
}
console.log(`\nwrote ${plan.length} document(s): ${plan.map((w) => w.label).join(", ")}`);
