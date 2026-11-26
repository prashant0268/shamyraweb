// READ-ONLY one-off audit: lists PayPal orders that were marked paid (or later moved on to fulfilled / shipped /
// delivered / refunded) while their checkout origin was NOT a production host (kindflames.com / www.kindflames.com).
//
// Why: before the Nov 2026 fix, createPayPalOrder/capturePayPalOrder picked PayPal live vs sandbox from the
// browser-supplied origin, and localhost origins were accepted on production. An order started with origin
// http://localhost:5173 used PayPal SANDBOX, so it could be "paid" with a free sandbox buyer account and still be
// marked paid in the production database. Every order this script prints needs checking by hand: look up its
// capture id in the LIVE PayPal account (PayPal → Activity → search). If live PayPal has no such payment, the order
// was never really paid: do not ship it (or, if already shipped, treat it as a loss/fraud case).
//
// It writes nothing. Run with the Firebase CLI's credentials:
//   npx -y firebase-tools@15 emulators:exec --project prod --only functions \
//     "node functions/scripts/audit-paypal-origins.mjs"
// or with Application Default Credentials (gcloud auth application-default login):
//   node functions/scripts/audit-paypal-origins.mjs --project shamyra-web
//
// Flags: --project <id> (else GCLOUD_PROJECT) · --hosts kindflames.com,www.kindflames.com (production hosts;
// default: SITE_URL host from functions/.env.<project> or kindflames.com, with and without www) · --json

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const { isProductionHostOrigin } = require("../payments.js");

const args = process.argv.slice(2);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const projectId = opt("--project") || process.env.GCLOUD_PROJECT;
if (!projectId) { console.error("Pass --project <id> (or run under emulators:exec)."); process.exit(2); }

function siteHostFromEnv() {
  try {
    const env = readFileSync(new URL(`../.env.${projectId}`, import.meta.url), "utf8");
    const m = env.match(/^SITE_URL=(.+)$/m);
    return m ? new URL(m[1].trim()).hostname : null;
  } catch { return null; }
}
const base = (siteHostFromEnv() || "kindflames.com").replace(/^www\./, "");
const hosts = opt("--hosts") ? opt("--hosts").split(",").map((s) => s.trim()).filter(Boolean) : [base, `www.${base}`];

initializeApp({ projectId });
const db = getFirestore();

// Single-field equality query: served by Firestore's automatic index, no composite index needed.
const snap = await db.collection("orders").where("paymentMethod", "==", "paypal").get();
const PAID_LIKE = ["paid", "fulfilled", "shipped", "delivered", "refunded"];
const ms = (t) => (t?.toMillis ? t.toMillis() : null);
const flagged = [];
let paidCount = 0;
for (const d of snap.docs) {
  const o = d.data();
  const paid = o.paymentStatus === "paid" || o.paymentStatus === "refunded" || o.paymentStatus === "partially_refunded" || PAID_LIKE.includes(o.status) || !!o.paidAt;
  if (!paid) continue;
  paidCount++;
  if (isProductionHostOrigin(o.origin || "", hosts) && o.paypalEnv !== "sandbox") continue;
  flagged.push({
    id: d.id, number: o.number, status: o.status, paymentStatus: o.paymentStatus, total: o.total,
    origin: o.origin || "(none)", paypalEnv: o.paypalEnv || "(not recorded)", paypalOrderId: o.paypalOrderId || null,
    captureId: o.payment?.captureId || null, payerEmail: o.payment?.payerEmail || null, email: o.email || null,
    createdAt: ms(o.createdAt) ? new Date(ms(o.createdAt)).toISOString() : null, paidAt: ms(o.paidAt) ? new Date(ms(o.paidAt)).toISOString() : null,
  });
}
flagged.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

if (args.includes("--json")) { console.log(JSON.stringify({ projectId, productionHosts: hosts, paypalOrdersScanned: snap.size, paidPayPalOrders: paidCount, flagged }, null, 2)); process.exit(0); }

console.log(`Project ${projectId} · production hosts: ${hosts.join(", ")}`);
console.log(`PayPal orders scanned: ${snap.size} · paid-like: ${paidCount} · NOT from a production host: ${flagged.length}`);
if (!flagged.length) { console.log("Nothing to check. (Read-only: nothing was changed.)"); process.exit(0); }
console.log("\nCheck each capture id in the LIVE PayPal account; no live payment = never really paid:\n");
for (const f of flagged) {
  console.log(`${f.number || f.id}  ${f.status}/${f.paymentStatus}  $${Number(f.total).toFixed(2)}  origin=${f.origin}  env=${f.paypalEnv}`);
  console.log(`   order ${f.id} · created ${f.createdAt} · paid ${f.paidAt} · paypalOrder ${f.paypalOrderId} · capture ${f.captureId} · payer ${f.payerEmail} · customer ${f.email}`);
}
console.log("\n(Read-only: nothing was changed.)");
