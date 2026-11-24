/**
 * Pure payment logic (no Firestore, no network) so it can be unit-tested: PayPal environment selection,
 * PayPal capture validation, Stripe session status, PayPal error parsing. index.js wires these to the providers.
 */
const cents = (n) => Math.round(Number(n) * 100);

/** The PayPal environment a project uses. Production is always live, everything else always sandbox.
 *  The browser's origin plays no part (it used to, which let a prod order be paid with a sandbox buyer). */
const paypalEnvFor = (isProduction) => (isProduction ? "live" : "sandbox");

/**
 * The PayPal environment to use for an existing order (capture, refund, reconcile, webhook).
 * Uses order.paypalEnv (stored at creation); orders created before that field existed fall back to the project's
 * environment. Throws when the stored value disagrees with the project, e.g. a "sandbox" order on production:
 * production must never talk to sandbox, and a test project must never talk to live.
 */
function paypalEnvForOrder(order, isProduction) {
  const projectEnv = paypalEnvFor(isProduction);
  const stored = order?.paypalEnv;
  if (stored == null || stored === "") return projectEnv;
  if (stored !== projectEnv) {
    const err = new Error(`Order uses PayPal ${stored} but this project only uses ${projectEnv}.`);
    err.code = "failed-precondition";
    throw err;
  }
  return stored;
}

/** Normalises a capture from the SDK (camelCase) or a webhook/REST payload (snake_case). */
function normCapture(c) {
  if (!c) return null;
  const amount = c.amount || {};
  return {
    id: c.id || null,
    status: c.status || null,
    currency: String(amount.currencyCode ?? amount.currency_code ?? "").toUpperCase(),
    value: amount.value ?? null,
    reason: c.statusDetails?.reason ?? c.status_details?.reason ?? null,
    customId: c.customId ?? c.custom_id ?? null,
  };
}

/**
 * Decides what a PayPal order (getOrder / captureOrder result, SDK camelCase or REST snake_case) means for our order.
 * Returns { state, capture, reason } where state is one of:
 *   "paid"      capture COMPLETED for exactly order.total USD → markOrderPaid
 *   "pending"   capture PENDING (eCheck, review, …) → keep pending, record, tell the owner
 *   "failed"    capture DECLINED / FAILED, or the PayPal order was VOIDED
 *   "refunded"  capture REFUNDED / PARTIALLY_REFUNDED
 *   "mismatch"  captured, but amount / currency / order id do not match → never mark paid, flag for review
 *   "approved"  buyer approved, not captured yet (the server may capture it)
 *   "unpaid"    nothing has happened yet (CREATED, SAVED, PAYER_ACTION_REQUIRED, …)
 */
function evaluatePayPalOrder(result, order) {
  const pu = (result?.purchaseUnits || result?.purchase_units || [])[0] || {};
  const captures = pu.payments?.captures || [];
  const capture = normCapture(captures[0]);
  const orderStatus = result?.status || null;
  if (!capture) {
    if (orderStatus === "APPROVED") return { state: "approved", capture: null, reason: null };
    if (orderStatus === "VOIDED") return { state: "failed", capture: null, reason: "PayPal order voided" };
    return { state: "unpaid", capture: null, reason: orderStatus };
  }
  if (captures.length > 1) return { state: "mismatch", capture, reason: `expected 1 capture, got ${captures.length}` };
  const customId = pu.customId ?? pu.custom_id ?? capture.customId;
  if (customId && order?.id && customId !== order.id) return { state: "mismatch", capture, reason: `custom_id ${customId} is not order ${order.id}` };
  if (capture.currency !== "USD") return { state: "mismatch", capture, reason: `currency ${capture.currency || "missing"}` };
  if (capture.value == null || !Number.isFinite(Number(capture.value)) || cents(capture.value) !== cents(order?.total)) {
    return { state: "mismatch", capture, reason: `captured ${capture.value} but order total is ${Number(order?.total).toFixed(2)}` };
  }
  switch (capture.status) {
    case "COMPLETED": return { state: "paid", capture, reason: null };
    case "PENDING": return { state: "pending", capture, reason: capture.reason || "PENDING" };
    case "DECLINED": case "FAILED": return { state: "failed", capture, reason: capture.status };
    case "REFUNDED": case "PARTIALLY_REFUNDED": return { state: "refunded", capture, reason: capture.status };
    default: return { state: "mismatch", capture, reason: `unknown capture status ${capture.status}` };
  }
}

/** PayPal API error → first issue code (e.g. "ORDER_ALREADY_CAPTURED") or null. */
function paypalIssue(err) {
  const pick = (r) => r?.details?.[0]?.issue || null;
  if (pick(err?.result)) return pick(err.result);
  if (typeof err?.body === "string") { try { return pick(JSON.parse(err.body)); } catch { /* not JSON */ } }
  return null;
}

/** Stripe Checkout Session (mode payment) → "paid" | "processing" | "unpaid" | "expired". */
function stripeSessionState(session) {
  if (!session) return "unpaid";
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return "paid";
  if (session.status === "complete") return "processing"; // async method (ACH, …) submitted, funds not confirmed yet
  if (session.status === "expired") return "expired";
  return "unpaid";
}

const LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"];
/** "kindflames.com" → ["kindflames.com", "www.kindflames.com"] (and the reverse); Firebase Hosting default domains
 *  have no www form; [] when there is no host. */
const hostVariants = (host) => (!host ? [] : /\.(web\.app|firebaseapp\.com)$/.test(host) ? [host] : host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`]);
/** Browser origins allowed to start a checkout: the site (with/without www), the project's Firebase Hosting domains,
 *  EXTRA_ORIGINS, and the Vite dev/preview ports only outside production. */
function allowedOrigins({ siteUrl, projectId, extraOrigins = [], isProduction }) {
  const host = (() => { try { return new URL(siteUrl).hostname; } catch { return ""; } })();
  return [...new Set([
    siteUrl,
    ...hostVariants(host).map((h) => `https://${h}`),
    ...(projectId ? [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`] : []),
    ...extraOrigins,
    ...(isProduction ? [] : LOCAL_ORIGINS),
  ])];
}

/** Hostname of an order origin is one of the production hosts? Used by the abuse audit script. */
function isProductionHostOrigin(origin, productionHosts) {
  try { return productionHosts.includes(new URL(origin).hostname); } catch { return false; }
}

module.exports = { allowedOrigins, hostVariants, LOCAL_ORIGINS, paypalEnvFor, paypalEnvForOrder, normCapture, evaluatePayPalOrder, paypalIssue, stripeSessionState, isProductionHostOrigin, cents };
