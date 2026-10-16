// Pure unit tests for the marketing drip selectors (no Firebase). Run: node functions/scripts/test-marketing-unit.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { welcomeStepDue, orderActionsDue, DAY } = require("../marketing.js");

let fails = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const now = Date.parse("2026-11-01T15:00:00Z");
const ago = (days) => now - days * DAY;

// Welcome series
check("welcome: stage 1, 2 days → nothing", welcomeStepDue({ source: "newsletter", welcomeStage: 1, welcomeAt: ago(2) }, now), null);
check("welcome: stage 1, 3 days → #2", welcomeStepDue({ source: "newsletter", welcomeStage: 1, welcomeAt: ago(3) }, now), 2);
check("welcome: stage 2, 3 days → nothing", welcomeStepDue({ source: "newsletter", welcomeStage: 2, welcomeAt: ago(3) }, now), null);
check("welcome: stage 2, 4 days → #3", welcomeStepDue({ source: "newsletter", welcomeStage: 2, welcomeAt: ago(4) }, now), 3);
check("welcome: stage 3 → done", welcomeStepDue({ source: "newsletter", welcomeStage: 3, welcomeAt: ago(30) }, now), null);
check("welcome: unsubscribed → nothing", welcomeStepDue({ source: "newsletter", welcomeStage: 1, welcomeAt: ago(9), unsubscribed: true }, now), null);
check("welcome: order-sourced contact never gets series", welcomeStepDue({ source: "order", welcomeStage: 1, welcomeAt: ago(9) }, now), null);
check("welcome: Firestore Timestamp accepted", welcomeStepDue({ source: "newsletter", welcomeStage: 1, welcomeAt: { toMillis: () => ago(5) } }, now), 2);

// Orders
const o = (over) => ({ id: "o", email: "a@x.com", status: "delivered", paymentMethod: "paypal", paidAt: ago(10), shippedAt: ago(5), ...over });
const types = (orders, unsub) => orderActionsDue(orders, now, unsub).map((a) => `${a.type}:${a.order.id}`);

check("care: shipped 5 days ago → care", types([o()]), ["care:o"]);
check("care: shipped 1 day ago → wait", types([o({ shippedAt: ago(1) })]), []);
check("care: shipped 30 days ago → too old", types([o({ shippedAt: ago(30), paidAt: ago(31) })]), []);
check("care: already sent", types([o({ careSent: true })]), []);
check("care: status paid (not shipped yet) → no", types([o({ status: "paid", shippedAt: null })]), []);
check("care: legacy order without shippedAt → no", types([o({ shippedAt: undefined })]), []);
check("care: cancelled → no", types([o({ status: "cancelled" })]), []);
check("care: unsubscribed → no", types([o()], (e) => e === "a@x.com"), []);

check("reorder: paid 45 days ago → reorder", types([o({ paidAt: ago(45), shippedAt: ago(43), careSent: true })]), ["reorder:o"]);
check("reorder: paid 44 days ago → wait", types([o({ paidAt: ago(44), shippedAt: ago(43), careSent: true })]), []);
check("reorder: paid 61 days ago → too old", types([o({ paidAt: ago(61), shippedAt: ago(60), careSent: true })]), []);
check("reorder: already sent", types([o({ paidAt: ago(50), shippedAt: ago(48), careSent: true, reorderSent: true })]), []);
check("reorder: subscription shipment → no", types([o({ paidAt: ago(50), shippedAt: ago(48), careSent: true, paymentMethod: "subscription" })]), []);
check("reorder: newer order from same email suppresses", types([
  o({ id: "old", paidAt: ago(50), shippedAt: ago(48), careSent: true }),
  o({ id: "new", paidAt: ago(10), shippedAt: ago(8), careSent: true }),
]), []);
check("reorder: different emails independent", types([
  o({ id: "old", paidAt: ago(50), shippedAt: ago(48), careSent: true }),
  o({ id: "new", email: "b@x.com", paidAt: ago(10), shippedAt: ago(8), careSent: true }),
]), ["reorder:old"]);
check("care + reorder on one order both fire", types([o({ paidAt: ago(46), shippedAt: ago(3) })]), ["care:o", "reorder:o"]);
check("reorder: email case-insensitive grouping is caller's job (same string here)", types([o({ email: "A@x.com", paidAt: ago(46), shippedAt: ago(44), careSent: true })]), ["reorder:o"]);

console.log(fails ? `MARKETING UNIT TESTS: ${fails} failed` : "MARKETING UNIT TESTS: all passed");
process.exit(fails ? 1 : 0);
