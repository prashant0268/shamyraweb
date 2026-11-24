/**
 * Kind Flames — Cloud Functions (Gen 2, Node 20)
 *
 * All money math happens here. The browser only sends product/variant ids and
 * quantities; prices, discounts, shipping and tax are computed from Firestore
 * (falling back to catalog.json before the catalog is seeded). Orders are
 * written only by these functions, never by the client.
 */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const Stripe = require("stripe");
const { Client, Environment, OrdersController, PaymentsController } = require("@paypal/paypal-server-sdk");
const CATALOG = require("./catalog.json");
const { priceCart: pricePure, round2, cents, fmt, PricingError } = require("./pricing");
const { createMarketing } = require("./marketing");
const { allowedOrigins, paypalEnvFor, paypalEnvForOrder, evaluatePayPalOrder, paypalIssue, stripeSessionState } = require("./payments");

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

/* ----------------------------- configuration -----------------------------
 * Non-secret config comes from functions/.env (shared fallback) overlaid by functions/.env.<projectId>
 * (.env.shamyra-web = production, .env.kindflames-test = test). The Firebase CLI loads both at deploy time and in
 * the emulator. Secrets (STRIPE_*, PAYPAL_*, RESEND_API_KEY) stay in Secret Manager, one set per project.
 * Code defaults below equal the historical hardcoded production values, so a missing env file changes nothing
 * for shamyra-web. See docs/ENVIRONMENTS.md. */
const ENV = process.env;
const PROJECT_ID = ENV.GCLOUD_PROJECT || (() => { try { return JSON.parse(ENV.FIREBASE_CONFIG || "{}").projectId || ""; } catch { return ""; } })();
const SITE_URL = (ENV.SITE_URL || "https://kindflames.com").replace(/\/$/, "");
/** Real store? Gates live PayPal and the "production hosts". Anything but an explicit "false" counts as production. */
const IS_PRODUCTION = String(ENV.IS_PRODUCTION ?? "true").trim().toLowerCase() !== "false";
const ADMIN_EMAILS = (ENV.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const OWNER_EMAIL = ENV.OWNER_EMAIL || ADMIN_EMAILS[0] || "";
const FROM_EMAIL = ENV.FROM_EMAIL || "Kind Flames <orders@kindflames.com>";
// Feature flags that change which secrets a function binds live in features.json (read at both deploy-analysis
// and runtime). .env values are NOT visible during the CLI's deploy analysis, so they can't gate secret bindings.
// features.<projectId>.json (optional) overrides features.json for one project, e.g. the webhook only on test.
const FEATURES_PROJECT = process.env.GCLOUD_PROJECT || (() => { try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId; } catch { return ""; } })() || "";
const FEATURES = (() => { const base = require("./features.json"); try { return { ...base, ...require(`./features.${FEATURES_PROJECT}.json`) }; } catch { return base; } })();
const ENABLE_RESEND = FEATURES.resend === true;
const ENABLE_STRIPE_WEBHOOK = FEATURES.stripeWebhook === true;
const ENABLE_PAYPAL_WEBHOOK = FEATURES.paypalWebhook === true;
const MAIL_SECRETS = ENABLE_RESEND ? ["RESEND_API_KEY"] : [];
const STRIPE_SECRETS = ["STRIPE_SECRET_KEY", ...MAIL_SECRETS];
// PAYPAL_MODE is no longer read (the environment follows IS_PRODUCTION) and no longer bound; the secret can stay.
const PAYPAL_SECRETS = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_SECRET_LIVE", ...MAIL_SECRETS];
const PAYMENT_SECRETS = [...new Set([...STRIPE_SECRETS, ...PAYPAL_SECRETS])];
const EXTRA_ORIGINS = (ENV.EXTRA_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
/** Browser origins allowed to start a checkout (localhost only outside production); see payments.allowedOrigins. */
const ALLOWED_ORIGINS = allowedOrigins({ siteUrl: SITE_URL, projectId: PROJECT_ID, extraOrigins: EXTRA_ORIGINS, isProduction: IS_PRODUCTION });
/** PayPal environment for this project: live in production, sandbox everywhere else. Never chosen from the
 *  browser's origin; stored on each order as paypalEnv and read back from there for capture and refund. */
const PAYPAL_ENV = paypalEnvFor(IS_PRODUCTION);

const { DEFAULT_SETTINGS } = require("./defaults");

async function getProduct(id) {
  const snap = await db.doc(`products/${id}`).get();
  if (snap.exists) return { id: snap.id, ...snap.data() };
  const local = CATALOG.find((p) => p.id === id);
  return local ? { ...local, _fallback: true } : null;
}
const pricingDeps = {
  getProduct,
  getDiscount: async (code) => { const snap = await db.doc(`discounts/${code}`).get(); return snap.exists ? snap.data() : null; },
  hasPriorOrders: async (uid) => !(await db.collection("orders").where("userId", "==", uid).where("status", "in", ["paid", "fulfilled", "shipped", "delivered"]).limit(1).get()).empty,
};
async function priceCart(input, settings, uid) {
  try { return await pricePure(input, settings, uid, pricingDeps); }
  catch (e) { if (e instanceof PricingError) throw new HttpsError(e.code, e.message); throw e; }
}

async function getSettings() {
  const snap = await db.doc("settings/store").get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
}


function cleanAddress(a = {}) {
  const s = (v) => String(v || "").trim().slice(0, 120);
  const addr = { fullName: s(a.fullName), address: s(a.address), address2: s(a.address2), city: s(a.city), state: s(a.state).toUpperCase().slice(0, 2), zipCode: s(a.zipCode), phone: s(a.phone), country: "US" };
  for (const k of ["fullName", "address", "city", "state", "zipCode"]) if (!addr[k]) throw new HttpsError("invalid-argument", "Please complete your shipping address.");
  return addr;
}

async function nextOrderNumber() {
  const ref = db.doc("counters/orders");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = snap.exists ? snap.data().next : 1001;
    tx.set(ref, { next: next + 1 }, { merge: true });
    return `KF-${next}`;
  });
}

async function createPendingOrder({ uid, email, pricing, shippingAddress, gift, paymentMethod, origin, extra = {} }) {
  const number = await nextOrderNumber();
  const ref = db.collection("orders").doc();
  const order = {
    number, userId: uid, email: String(email || "").toLowerCase().slice(0, 200), customerName: shippingAddress.fullName,
    items: pricing.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, name: l.name, variantLabel: l.variantLabel, price: l.unitPrice, quantity: l.quantity, image: l.image, lineDiscount: l.lineDiscount, bundle: l.bundle })),
    subtotal: pricing.subtotal, bundleDiscount: pricing.bundleDiscount, discount: pricing.discount, discountTotal: pricing.discountTotal, giftWrap: pricing.giftWrap,
    shipping: pricing.shipping, tax: pricing.tax, taxRate: pricing.taxRate, total: pricing.total, currency: "usd",
    shippingAddress, gift: { isGift: !!gift?.isGift, wrap: !!gift?.wrap, message: String(gift?.message || "").slice(0, 300) },
    paymentMethod, paymentStatus: "pending", status: "pending", origin: origin || "",
    tracking: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: null,
    ...extra,
  };
  await ref.set(order);
  return { id: ref.id, ...order };
}

/** Idempotently marks an order paid, decrements stock, counts discount usage, sends emails.
 *  Callers must have verified the payment with the provider first. extra: more fields to write with the status. */
async function markOrderPaid(orderId, payment, extra = {}) {
  const ref = db.doc(`orders/${orderId}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snap.data();
    if (order.paymentStatus === "paid") return { already: true, order: { id: snap.id, ...order } };
    tx.update(ref, { ...extra, paymentStatus: "paid", status: "paid", paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), payment: payment || {} });
    return { already: false, order: { id: snap.id, ...order, paymentStatus: "paid", status: "paid" } };
  });
  if (result.already) return result.order;

  // Stock + discount usage (best effort, outside the transaction).
  for (const item of result.order.items) {
    const pref = db.doc(`products/${item.productId}`);
    try {
      await db.runTransaction(async (tx) => {
        const ps = await tx.get(pref);
        if (!ps.exists) return;
        const variants = (ps.data().variants || []).map((v) => v.id === item.variantId && typeof v.stock === "number" ? { ...v, stock: Math.max(0, v.stock - item.quantity) } : v);
        tx.update(pref, { variants, updatedAt: FieldValue.serverTimestamp() });
      });
    } catch (e) { console.error("stock update failed", item.productId, e.message); }
  }
  if (result.order.discount?.code) {
    await db.doc(`discounts/${result.order.discount.code}`).set({ usageCount: FieldValue.increment(1) }, { merge: true }).catch(() => {});
  }
  await Promise.all([sendOrderConfirmation(result.order), sendOwnerNewOrder(result.order)]).catch((e) => console.error("email failed", e.message));
  await marketing.onOrderPaid(result.order).catch((e) => console.error("marketing contact failed", e.message));
  return result.order;
}

function assertOrigin(origin) {
  if (!origin) return SITE_URL;
  const o = String(origin).replace(/\/$/, "");
  if (!ALLOWED_ORIGINS.includes(o)) throw new HttpsError("permission-denied", "Unknown origin.");
  return o;
}
function requireAuth(request) { if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in or continue as guest."); return request.auth.uid; }
function requireAdmin(request) { if (!request.auth?.token?.admin) throw new HttpsError("permission-denied", "Admins only."); return request.auth.uid; }

/* ------------------------------- quoting --------------------------------- */
exports.quoteCart = onCall({ cors: true }, async (request) => {
  const settings = await getSettings();
  const pricing = await priceCart(request.data || {}, settings, request.auth?.uid);
  return { ...pricing, settings: { freeShippingThreshold: settings.freeShippingThreshold, flatShipping: settings.flatShipping, expressShipping: settings.expressShipping, giftWrapFee: settings.giftWrapFee } };
});

/* -------------------------------- Stripe --------------------------------- */
const getStripe = () => { const k = process.env.STRIPE_SECRET_KEY; if (!k) throw new HttpsError("failed-precondition", "Card payments are not configured."); return new Stripe(k); };

exports.createStripeCheckout = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const settings = await getSettings();
  // Production honours the admin switch whatever origin the browser claims; test projects always allow cards.
  if (IS_PRODUCTION && !settings.cardPaymentsEnabled) throw new HttpsError("failed-precondition", "Card payments are not enabled yet. Please use PayPal.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const pricing = await priceCart({ ...data, shippingAddress }, settings, uid);
  const order = await createPendingOrder({ uid, email: data.email, pricing, shippingAddress, gift: data.gift, paymentMethod: "stripe", origin });
  const stripe = getStripe();

  const line_items = pricing.lines.map((l) => ({
    quantity: l.quantity,
    price_data: { currency: "usd", unit_amount: cents(l.unitPrice), product_data: { name: `${l.name} — ${l.variantLabel}`, images: l.image ? [SITE_URL + l.image] : [] } },
  }));
  if (pricing.giftWrap) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.giftWrap), product_data: { name: "Gift box & card" } } });
  if (pricing.shipping.amount) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.shipping.amount), product_data: { name: pricing.shipping.method === "express" ? "UPS 2nd Day Air" : "Standard shipping" } } });
  if (pricing.tax) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents(pricing.tax), product_data: { name: `Sales tax (${shippingAddress.state})` } } });

  const sessionParams = {
    mode: "payment", line_items, customer_email: order.email || undefined,
    success_url: `${origin}/order-confirmation?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    metadata: { orderId: order.id, orderNumber: order.number },
    payment_intent_data: { description: `Kind Flames order ${order.number}`, metadata: { orderId: order.id } },
  };
  if (pricing.discountTotal > 0) {
    const coupon = await stripe.coupons.create({ amount_off: cents(pricing.discountTotal), currency: "usd", duration: "once", name: pricing.discount.code ? `${pricing.discount.code}${pricing.bundleDiscount ? " + bundle" : ""}` : "Bundle discount" });
    sessionParams.discounts = [{ coupon: coupon.id }];
  }
  const session = await stripe.checkout.sessions.create(sessionParams);
  await db.doc(`orders/${order.id}`).update({ stripeSessionId: session.id });
  return { orderId: order.id, orderNumber: order.number, url: session.url };
});

const stripePayment = (s, source) => ({
  provider: "stripe", sessionId: s.id, paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id || null,
  payerEmail: s.customer_details?.email || null, amount: s.amount_total != null ? s.amount_total / 100 : null, currency: s.currency || null,
  stripePaymentStatus: s.payment_status || null, source,
});

/** Re-reads a Stripe Checkout Session for one of our orders and applies it. Returns { state, order? }. */
async function reconcileStripe(order, source) {
  let session;
  try { session = await getStripe().checkout.sessions.retrieve(String(order.stripeSessionId)); }
  catch (e) { if (e?.statusCode === 404 || e?.code === "resource_missing") return { state: "not_found" }; throw e; }
  if (session.metadata?.orderId !== order.id) { console.error("stripe session/order mismatch", order.id, session.id); return { state: "mismatch" }; }
  return applyStripeSession(order, session, source);
}
async function applyStripeSession(order, session, source) {
  const state = stripeSessionState(session);
  if (state === "paid") return { state, order: await markOrderPaid(order.id, stripePayment(session, source)) };
  if (state === "processing" && order.stripePaymentStatus !== "processing") {
    await db.doc(`orders/${order.id}`).update({ stripePaymentStatus: "processing", updatedAt: FieldValue.serverTimestamp() });
  }
  return { state };
}

exports.verifyStripePayment = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { sessionId, orderId } = request.data || {};
  if (!sessionId || !orderId) throw new HttpsError("invalid-argument", "Missing session.");
  const snap = await db.doc(`orders/${orderId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = { id: snap.id, ...snap.data() };
  if (order.userId !== uid && !request.auth.token.admin) throw new HttpsError("permission-denied", "Not your order.");
  if (order.stripeSessionId && order.stripeSessionId !== String(sessionId)) throw new HttpsError("permission-denied", "Session does not match order.");
  const session = await getStripe().checkout.sessions.retrieve(String(sessionId));
  if (session.metadata?.orderId !== orderId) throw new HttpsError("permission-denied", "Session does not match order.");
  const { state, order: paid } = await applyStripeSession(order, session, "verify");
  if (state !== "paid") return { paid: false, status: state === "processing" ? "processing" : session.payment_status };
  return { paid: true, order: publicOrder(paid) };
});

/** Finds our order for a Stripe PaymentIntent (charge / dispute events). */
async function findOrderByPaymentIntent(stripe, paymentIntentId) {
  if (!paymentIntentId) return null;
  const pi = typeof paymentIntentId === "string" ? paymentIntentId : paymentIntentId.id;
  const q = await db.collection("orders").where("payment.paymentIntentId", "==", pi).limit(1).get();
  if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };
  const intent = await stripe.paymentIntents.retrieve(pi).catch(() => null);
  const orderId = intent?.metadata?.orderId;
  if (!orderId) return null;
  const snap = await db.doc(`orders/${orderId}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

/** Records a full or partial refund on an order (from a provider event; refundOrder writes its own). */
async function applyRefund(order, { full, amount, provider, source }) {
  const update = { paymentStatus: full ? "refunded" : "partially_refunded", refundedAmount: amount ?? null, refundSource: `${provider}:${source}`, updatedAt: FieldValue.serverTimestamp() };
  if (full && order.status !== "refunded") update.status = "refunded";
  await db.doc(`orders/${order.id}`).update(update);
}

async function notifyOwner(subject, body) {
  return sendMail({ to: OWNER_EMAIL, subject, html: wrapEmail(body) }).catch((e) => console.error("owner mail failed", e.message));
}
const orderLink = (o) => `<a href="${SITE_URL}/admin/orders">Order ${esc(o.number || o.id)}</a>`;

async function handleStripeEvent(stripe, event) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const orderId = obj.metadata?.orderId;
      if (!orderId || obj.mode !== "payment") return; // subscription checkouts are handled by verifySubscription
      const snap = await db.doc(`orders/${orderId}`).get();
      if (!snap.exists) { console.error("stripe webhook: order not found", orderId, obj.id); return; }
      const order = { id: snap.id, ...snap.data() };
      if (order.stripeSessionId && order.stripeSessionId !== obj.id) { console.error("stripe webhook: session mismatch", orderId, obj.id); return; }
      await applyStripeSession(order, obj, "webhook");
      return;
    }
    case "checkout.session.async_payment_failed": {
      const orderId = obj.metadata?.orderId;
      if (!orderId || obj.mode !== "payment") return;
      const snap = await db.doc(`orders/${orderId}`).get();
      if (!snap.exists || snap.data().paymentStatus === "paid") return;
      await snap.ref.update({ paymentStatus: "failed", stripePaymentStatus: "failed", updatedAt: FieldValue.serverTimestamp() });
      await notifyOwner(`Payment failed for order ${snap.data().number}`, `<p>The delayed card/bank payment for ${orderLink({ id: snap.id, ...snap.data() })} failed. The order was not marked paid; don't ship it.</p>`);
      return;
    }
    case "charge.refunded": {
      const order = await findOrderByPaymentIntent(stripe, obj.payment_intent);
      if (!order) { console.error("stripe webhook: no order for refunded charge", obj.id); return; }
      const full = obj.refunded === true || obj.amount_refunded >= obj.amount;
      await applyRefund(order, { full, amount: obj.amount_refunded / 100, provider: "stripe", source: "webhook" });
      return;
    }
    case "charge.dispute.created": {
      const order = await findOrderByPaymentIntent(stripe, obj.payment_intent);
      const dispute = { id: obj.id, reason: obj.reason || null, status: obj.status || null, amount: obj.amount != null ? obj.amount / 100 : null, evidenceDueBy: obj.evidence_details?.due_by || null };
      if (order) await db.doc(`orders/${order.id}`).update({ dispute, updatedAt: FieldValue.serverTimestamp() });
      const due = dispute.evidenceDueBy ? new Date(dispute.evidenceDueBy * 1000).toDateString() : "see Stripe";
      await notifyOwner(`Stripe dispute opened${order ? ` on order ${order.number}` : ""} — ${dispute.amount != null ? fmt(dispute.amount) : ""}`,
        `<p>A customer disputed a card payment${order ? ` for ${orderLink(order)} (${esc(order.customerName)}, ${esc(order.email)})` : ` (charge ${esc(obj.charge)}; no matching order found)`}.</p><ul><li>Reason: ${esc(dispute.reason)}</li><li>Amount: ${dispute.amount != null ? fmt(dispute.amount) : "?"}</li><li>Evidence due: ${esc(due)}</li></ul><p>Respond in the Stripe dashboard → Payments → Disputes. Hold the shipment if it hasn't gone out.</p>`);
      return;
    }
    default:
      return;
  }
}

if (ENABLE_STRIPE_WEBHOOK) {
  // Endpoint: https://us-central1-<projectId>.cloudfunctions.net/stripeWebhook. Events: checkout.session.completed,
  // checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, charge.refunded,
  // charge.dispute.created. See docs/ENVIRONMENTS.md ("Payment webhooks").
  exports.stripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", ...MAIL_SECRETS] }, async (req, res) => {
    const stripe = getStripe();
    let event;
    try { event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
    catch (e) { console.error("webhook signature failed", e.message); return res.status(400).send("bad signature"); }
    try { await handleStripeEvent(stripe, event); }
    catch (e) { console.error("stripe webhook handler failed", event.type, event.id, e.message); return res.status(500).send("retry"); }
    res.json({ received: true });
  });
}

/* -------------------------------- PayPal --------------------------------- */
const PAYPAL_API = { live: "https://api-m.paypal.com", sandbox: "https://api-m.sandbox.paypal.com" };
function paypalCreds(env) {
  if (env !== PAYPAL_ENV) throw new HttpsError("failed-precondition", `This project only uses PayPal ${PAYPAL_ENV}.`);
  const live = env === "live";
  const clientId = ((live ? process.env.PAYPAL_CLIENT_ID_LIVE : process.env.PAYPAL_CLIENT_ID) || "").trim();
  const clientSecret = ((live ? process.env.PAYPAL_CLIENT_SECRET_LIVE : process.env.PAYPAL_CLIENT_SECRET) || "").trim();
  if (!clientId || !clientSecret) throw new HttpsError("failed-precondition", `PayPal ${env} credentials are not configured.`);
  return { clientId, clientSecret };
}
/** env is "live" | "sandbox" — from PAYPAL_ENV for new orders, from order.paypalEnv afterwards. Never from the origin. */
function getPayPalClient(env) {
  const { clientId, clientSecret } = paypalCreds(env);
  return new Client({ clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret }, environment: env === "live" ? Environment.Production : Environment.Sandbox });
}
function orderPayPalEnv(order) {
  try { return paypalEnvForOrder(order, IS_PRODUCTION); } catch (e) { throw new HttpsError("failed-precondition", e.message); }
}

exports.createPayPalOrder = onCall({ cors: true, secrets: PAYPAL_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const settings = await getSettings();
  if (!settings.paypalEnabled) throw new HttpsError("failed-precondition", "PayPal is not enabled.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const pricing = await priceCart({ ...data, shippingAddress }, settings, uid);
  const client = getPayPalClient(PAYPAL_ENV); // fail before writing an order if credentials are missing
  const order = await createPendingOrder({ uid, email: data.email, pricing, shippingAddress, gift: data.gift, paymentMethod: "paypal", origin, extra: { paypalEnv: PAYPAL_ENV } });

  const usd = (v) => ({ currencyCode: "USD", value: Number(v).toFixed(2) });
  const items = pricing.lines.map((l) => ({ name: `${l.name} — ${l.variantLabel}`.slice(0, 127), quantity: String(l.quantity), unitAmount: usd(l.unitPrice), category: "PHYSICAL_GOODS" }));
  if (pricing.giftWrap) items.push({ name: "Gift box & card", quantity: "1", unitAmount: usd(pricing.giftWrap), category: "PHYSICAL_GOODS" });
  const itemTotal = round2(pricing.subtotal + pricing.giftWrap);
  const { result } = await new OrdersController(client).createOrder({
    body: {
      intent: "CAPTURE",
      purchaseUnits: [{
        customId: order.id, invoiceId: order.number, description: `Kind Flames order ${order.number}`,
        amount: { currencyCode: "USD", value: pricing.total.toFixed(2), breakdown: { itemTotal: usd(itemTotal), shipping: usd(pricing.shipping.amount), taxTotal: usd(pricing.tax), discount: usd(pricing.discountTotal) } },
        items,
        shipping: { name: { fullName: shippingAddress.fullName }, address: { addressLine1: shippingAddress.address, addressLine2: shippingAddress.address2 || undefined, adminArea2: shippingAddress.city, adminArea1: shippingAddress.state, postalCode: shippingAddress.zipCode, countryCode: "US" } },
      }],
      applicationContext: { shippingPreference: "SET_PROVIDED_ADDRESS", brandName: "Kind Flames", userAction: "PAY_NOW" },
    },
    prefer: "return=representation",
  });
  await db.doc(`orders/${order.id}`).update({ paypalOrderId: result.id });
  return { orderId: order.id, orderNumber: order.number, paypalOrderId: result.id };
});

/** Captures an approved PayPal order; a retry after a successful capture (ORDER_ALREADY_CAPTURED) reads the order instead. */
async function capturePayPal(ctl, paypalOrderId) {
  try { return (await ctl.captureOrder({ id: paypalOrderId, prefer: "return=representation" })).result; }
  catch (e) {
    if (paypalIssue(e) !== "ORDER_ALREADY_CAPTURED") throw e;
    return (await ctl.getOrder({ id: paypalOrderId })).result;
  }
}

/**
 * Applies a PayPal order (capture or getOrder result) to our order after validating the capture: only a COMPLETED
 * capture of exactly order.total USD marks it paid. Returns { state, order? } (states: see evaluatePayPalOrder).
 */
async function applyPayPalOrder(order, result, source) {
  const ref = db.doc(`orders/${order.id}`);
  const v = evaluatePayPalOrder(result, order);
  const cap = v.capture;
  const track = { paypalOrderStatus: result?.status || null, paypalCaptureId: cap?.id || null, paypalCaptureStatus: cap?.status || null, updatedAt: FieldValue.serverTimestamp() };
  const payerEmail = result?.payer?.emailAddress || result?.payer?.email_address || null;
  switch (v.state) {
    case "paid": {
      const paid = await markOrderPaid(order.id, { provider: "paypal", paypalOrderId: order.paypalOrderId, captureId: cap.id, payerEmail, amount: Number(cap.value), currency: cap.currency, env: orderPayPalEnv(order), source }, track);
      return { state: "paid", order: paid };
    }
    case "pending": {
      if (order.paymentStatus === "paid") return { state: "paid", order };
      const first = !order.pendingNotifiedAt;
      await ref.update({ ...track, paypalPendingReason: v.reason, ...(first ? { pendingNotifiedAt: FieldValue.serverTimestamp() } : {}) });
      if (first) await notifyOwner(`PayPal payment pending for order ${order.number}`, `<p>PayPal accepted the payment for ${orderLink(order)} (${fmt(order.total)}) but is holding it: <b>${esc(v.reason)}</b>.</p><p>The order stays <b>pending</b> until PayPal completes the capture; it is re-checked every 30 minutes. Don't ship until it shows paid. Details in PayPal → Activity.</p>`);
      return { state: "pending" };
    }
    case "failed": {
      if (order.paymentStatus === "paid") return { state: "paid", order };
      await ref.update({ ...track, paymentStatus: "failed" });
      if (order.paypalCaptureStatus === "PENDING") await notifyOwner(`PayPal payment denied for order ${order.number}`, `<p>The pending PayPal payment for ${orderLink(order)} was <b>${esc(v.reason)}</b>. The order was never marked paid; don't ship it.</p>`);
      return { state: "failed" };
    }
    case "refunded": {
      await applyRefund(order, { full: cap.status === "REFUNDED", amount: null, provider: "paypal", source });
      return { state: "refunded" };
    }
    case "mismatch": {
      if (order.paymentStatus === "paid") return { state: "paid", order };
      const first = !order.paymentReview;
      await ref.update({ ...track, paymentReview: { reason: v.reason, source, at: new Date().toISOString() } });
      if (first) await notifyOwner(`Check PayPal payment for order ${order.number}`, `<p>PayPal reports a capture for ${orderLink(order)} that does not match the order, so it was <b>not</b> marked paid: ${esc(v.reason)}.</p><p>Compare it in PayPal → Activity and refund it there if it isn't legitimate.</p>`);
      return { state: "mismatch" };
    }
    default:
      return { state: v.state };
  }
}

/** Asks PayPal about one of our orders and applies the answer. captureApproved: capture an order the buyer approved
 *  but whose browser never called capturePayPalOrder (the buyer pressed "Pay Now"; this finishes their payment). */
async function reconcilePayPal(order, { captureApproved = false, source }) {
  const ctl = new OrdersController(getPayPalClient(orderPayPalEnv(order)));
  let result;
  try { result = (await ctl.getOrder({ id: String(order.paypalOrderId) })).result; }
  catch (e) { if (e?.statusCode === 404) return { state: "not_found" }; throw e; }
  if (captureApproved && result?.status === "APPROVED") {
    try { result = await capturePayPal(ctl, String(order.paypalOrderId)); }
    catch (e) { console.error("reconcile capture failed", order.id, paypalIssue(e) || e.message); return { state: "approved" }; }
  }
  return applyPayPalOrder(order, result, source);
}

/** What the payment provider says about an order. Throws when the provider can't be reached. */
async function reconcileOrder(order, opts) {
  if (order.paymentStatus === "paid") return { state: "paid", order };
  if (order.stripeSessionId) return reconcileStripe(order, opts.source);
  if (order.paypalOrderId) return reconcilePayPal(order, opts);
  return { state: "none" };
}
/** Provider states that mean money moved (or is moving): never delete or nag those orders. */
const MONEY_STATES = ["paid", "pending", "processing", "mismatch", "refunded"];

exports.capturePayPalOrder = onCall({ cors: true, secrets: PAYPAL_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { paypalOrderId, orderId } = request.data || {};
  if (!paypalOrderId || !orderId) throw new HttpsError("invalid-argument", "Missing order.");
  const snap = await db.doc(`orders/${orderId}`).get();
  if (!snap.exists || snap.data().userId !== uid) throw new HttpsError("permission-denied", "Not your order.");
  const order = { id: snap.id, ...snap.data() };
  if (order.paypalOrderId !== paypalOrderId) throw new HttpsError("permission-denied", "PayPal order does not match.");
  if (order.paymentStatus === "paid") return { paid: true, order: publicOrder(order) };
  const ctl = new OrdersController(getPayPalClient(orderPayPalEnv(order)));
  let result;
  try { result = await capturePayPal(ctl, paypalOrderId); }
  catch (e) {
    const issue = paypalIssue(e);
    console.error("paypal capture failed", orderId, issue || e.message);
    if (issue === "INSTRUMENT_DECLINED") throw new HttpsError("failed-precondition", "PayPal declined that payment method. Please try another one.");
    throw new HttpsError("internal", "PayPal could not complete the payment. You have not been charged; please try again.");
  }
  const outcome = await applyPayPalOrder(order, result, "capture");
  if (outcome.state === "paid") return { paid: true, order: publicOrder(outcome.order) };
  if (outcome.state === "pending") return { paid: false, status: "PENDING", message: "PayPal is reviewing this payment. We'll email you as soon as it clears; there's no need to pay again." };
  if (outcome.state === "mismatch") return { paid: false, status: "REVIEW", message: "We received a payment we need to check by hand. We'll email you shortly; please don't pay again." };
  return { paid: false, status: result?.status || outcome.state };
});

if (ENABLE_PAYPAL_WEBHOOK) {
  /** Exchanges the project's PayPal credentials for an access token (REST, for the webhook verification API). */
  const paypalAccessToken = async (env) => {
    const { clientId, clientSecret } = paypalCreds(env);
    const r = await fetch(`${PAYPAL_API[env]}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    if (!r.ok) throw new Error(`PayPal token request failed: ${r.status}`);
    return (await r.json()).access_token;
  };
  /** PayPal's verify-webhook-signature API. rawBody must already have parsed as a single JSON object (checked by the
   *  caller), so splicing it in verbatim cannot inject extra fields such as a different webhook_id. */
  const verifyPayPalWebhook = async (headers, rawBody) => {
    const webhookId = (process.env.PAYPAL_WEBHOOK_ID || "").trim();
    if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not set");
    const names = { auth_algo: "paypal-auth-algo", cert_url: "paypal-cert-url", transmission_id: "paypal-transmission-id", transmission_sig: "paypal-transmission-sig", transmission_time: "paypal-transmission-time" };
    const fields = Object.entries(names).map(([k, h]) => [k, headers[h]]);
    if (fields.some(([, v]) => !v || typeof v !== "string")) return false;
    const body = `{${fields.map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",")},"webhook_id":${JSON.stringify(webhookId)},"webhook_event":${rawBody}}`;
    const r = await fetch(`${PAYPAL_API[PAYPAL_ENV]}/v1/notifications/verify-webhook-signature`, { method: "POST", headers: { Authorization: `Bearer ${await paypalAccessToken(PAYPAL_ENV)}`, "Content-Type": "application/json" }, body });
    if (!r.ok) { console.error("paypal verify-webhook-signature", r.status, (await r.text()).slice(0, 300)); return false; }
    return (await r.json()).verification_status === "SUCCESS";
  };
  const findOrderForCapture = async (resource) => {
    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id || null;
    if (resource.custom_id) {
      const snap = await db.doc(`orders/${String(resource.custom_id)}`).get();
      if (snap.exists && (!paypalOrderId || snap.data().paypalOrderId === paypalOrderId)) return { id: snap.id, ...snap.data() };
    }
    if (!paypalOrderId) return null;
    const q = await db.collection("orders").where("paypalOrderId", "==", paypalOrderId).limit(1).get();
    return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
  };
  const handlePayPalEvent = async (event) => {
    const resource = event.resource || {};
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
      case "PAYMENT.CAPTURE.PENDING":
      case "PAYMENT.CAPTURE.DENIED": {
        const order = await findOrderForCapture(resource);
        if (!order) { console.error("paypal webhook: no order for capture", resource.id); return; }
        // Never trust the event body for money: re-read the order from PayPal and run the same checks as capture.
        await reconcilePayPal(order, { captureApproved: false, source: "webhook" });
        return;
      }
      case "PAYMENT.CAPTURE.REFUNDED": {
        const up = (resource.links || []).find((l) => l.rel === "up")?.href || "";
        const captureId = up.match(/\/captures\/([^/?]+)/)?.[1];
        if (!captureId) { console.error("paypal webhook: refund without capture link", resource.id); return; }
        let q = await db.collection("orders").where("payment.captureId", "==", captureId).limit(1).get();
        if (q.empty) q = await db.collection("orders").where("paypalCaptureId", "==", captureId).limit(1).get();
        if (q.empty) { console.error("paypal webhook: no order for refunded capture", captureId); return; }
        const order = { id: q.docs[0].id, ...q.docs[0].data() };
        const { result: capture } = await new PaymentsController(getPayPalClient(orderPayPalEnv(order))).getCapturedPayment({ captureId });
        if (!["REFUNDED", "PARTIALLY_REFUNDED"].includes(capture?.status)) return;
        await applyRefund(order, { full: capture.status === "REFUNDED", amount: null, provider: "paypal", source: "webhook" });
        return;
      }
      default:
        return;
    }
  };

  // Endpoint: https://us-central1-<projectId>.cloudfunctions.net/paypalWebhook. See docs/ENVIRONMENTS.md ("Payment webhooks").
  exports.paypalWebhook = onRequest({ secrets: [...PAYPAL_SECRETS, "PAYPAL_WEBHOOK_ID"] }, async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");
    const raw = req.rawBody ? req.rawBody.toString("utf8") : "";
    let event;
    try { event = JSON.parse(raw); } catch { return res.status(400).send("bad body"); }
    if (!event || typeof event !== "object" || Array.isArray(event)) return res.status(400).send("bad body");
    let ok;
    try { ok = await verifyPayPalWebhook(req.headers, raw); }
    catch (e) { console.error("paypal webhook verification error", e.message); return res.status(500).send("retry"); }
    if (!ok) return res.status(400).send("bad signature");
    try { await handlePayPalEvent(event); }
    catch (e) { console.error("paypal webhook handler failed", event.event_type, event.id, e.message); return res.status(500).send("retry"); }
    res.json({ received: true });
  });
}

/* ------------------------------ reconciliation ----------------------------- */
// Every 30 minutes: pending orders older than 15 minutes (up to 7 days) that reached Stripe or PayPal are checked
// with the provider and marked paid when paid. Covers buyers whose browser never came back and projects without
// webhooks. Approved-but-uncaptured PayPal orders are captured (the buyer already pressed "Pay Now").
exports.reconcilePendingPayments = onSchedule({ schedule: "every 30 minutes", timeoutSeconds: 300, secrets: PAYMENT_SECRETS }, async () => {
  const now = Date.now();
  const snap = await db.collection("orders").where("status", "==", "pending").orderBy("createdAt", "desc").limit(300).get();
  const counts = {};
  for (const d of snap.docs) {
    const o = { id: d.id, ...d.data() };
    const age = now - (o.createdAt?.toMillis ? o.createdAt.toMillis() : now);
    if (age < 15 * 60e3 || age > 7 * 864e5 || o.paymentStatus === "paid") continue;
    if (!o.stripeSessionId && !o.paypalOrderId) continue;
    try {
      const { state } = await reconcileOrder(o, { captureApproved: true, source: "reconciler" });
      counts[state] = (counts[state] || 0) + 1;
    } catch (e) { counts.error = (counts.error || 0) + 1; console.error("reconcile failed", o.id, e.message); }
  }
  console.log("reconcilePendingPayments", JSON.stringify(counts));
});

/* --------------------------------- admin --------------------------------- */
exports.ensureAdmin = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const email = (request.auth.token.email || "").toLowerCase();
  const should = !!email && ADMIN_EMAILS.includes(email);
  const has = request.auth.token.admin === true;
  if (should && !has) {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    await db.doc(`users/${uid}`).set({ role: "admin", email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return { admin: should || has, refreshed: should && !has };
});

exports.updateOrderStatus = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const { orderId, status, tracking, internalNotes } = request.data || {};
  const allowed = ["pending", "paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"];
  if (!orderId || !allowed.includes(status)) throw new HttpsError("invalid-argument", "Bad status.");
  const ref = db.doc(`orders/${orderId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const update = { status, updatedAt: FieldValue.serverTimestamp() };
  if (status === "shipped" && !snap.data().shippedAt) update.shippedAt = FieldValue.serverTimestamp();
  if (tracking) update.tracking = { carrier: String(tracking.carrier || "").slice(0, 40), number: String(tracking.number || "").slice(0, 60), url: trackingUrl(tracking) };
  if (typeof internalNotes === "string") update.internalNotes = internalNotes.slice(0, 2000);
  await ref.update(update);
  const order = { id: snap.id, ...snap.data(), ...update };
  if (status === "shipped") await sendShipped(order).catch((e) => console.error(e.message));
  if (status === "delivered") await sendReviewRequest(order).catch((e) => console.error(e.message));
  return { ok: true };
});

exports.refundOrder = onCall({ cors: true, secrets: PAYMENT_SECRETS }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  const ref = db.doc(`orders/${orderId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const order = snap.data();
  if (order.paymentStatus !== "paid") throw new HttpsError("failed-precondition", "Order is not paid.");
  if (order.payment?.provider === "stripe" && order.payment.paymentIntentId) {
    await getStripe().refunds.create({ payment_intent: order.payment.paymentIntentId });
  } else if (order.payment?.provider === "paypal" && order.payment.captureId) {
    await new PaymentsController(getPayPalClient(orderPayPalEnv(order))).refundCapturedPayment({ captureId: order.payment.captureId, prefer: "return=minimal" });
  } else {
    throw new HttpsError("failed-precondition", "No refundable payment on this order.");
  }
  await ref.update({ status: "refunded", paymentStatus: "refunded", updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/* ---------------------------- reviews aggregate --------------------------- */
exports.onReviewWritten = onDocumentWritten("reviews/{reviewId}", async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const productId = after?.productId || before?.productId;
  if (!productId) return;
  const snap = await db.collection("reviews").where("productId", "==", productId).where("approved", "==", true).get();
  const ratings = snap.docs.map((d) => Number(d.data().rating) || 0).filter((r) => r > 0);
  const rating = ratings.length ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
  await db.doc(`products/${productId}`).set({ rating, reviewCount: ratings.length }, { merge: true }).catch(() => {});
});

/* ------------------------------- corporate -------------------------------- */
// Admin-only: remove an order that was never paid (abandoned checkout, test order). Paid orders must be refunded, not deleted.
// Orders that reached Stripe/PayPal are checked with the provider first: a payment the browser never reported
// (closed tab, no webhook) is marked paid instead of being deleted.
exports.deleteOrder = onCall({ cors: true, secrets: PAYMENT_SECRETS }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  if (!orderId || typeof orderId !== "string") throw new HttpsError("invalid-argument", "orderId required.");
  const ref = db.doc(`orders/${orderId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  const o = snap.data();
  if (o.paymentStatus === "paid" || ["paid", "fulfilled", "shipped", "delivered"].includes(o.status)) {
    throw new HttpsError("failed-precondition", "Paid orders can't be deleted. Refund or cancel instead.");
  }
  if (o.stripeSessionId || o.paypalOrderId) {
    let check;
    try { check = await reconcileOrder({ id: snap.id, ...o }, { captureApproved: false, source: "admin-delete" }); }
    catch (e) {
      console.error("deleteOrder provider check failed", orderId, e.message);
      throw new HttpsError("unavailable", "Couldn't confirm with Stripe/PayPal that this order is unpaid, so it was not deleted. Try again in a few minutes.");
    }
    if (check.state === "paid") throw new HttpsError("failed-precondition", "The payment provider reports this order as paid, so it is now marked paid. Refund it instead of deleting it.");
    if (MONEY_STATES.includes(check.state)) throw new HttpsError("failed-precondition", `The payment provider reports a payment on this order (${check.state}), so it can't be deleted.`);
  }
  await ref.delete();
  return { ok: true };
});

exports.submitQuote = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  const d = request.data || {};
  const s = (v, n = 200) => String(v || "").trim().slice(0, n);
  const quote = {
    name: s(d.name), company: s(d.company), email: s(d.email).toLowerCase(), phone: s(d.phone, 40), quantity: Math.max(1, parseInt(d.quantity, 10) || 25),
    budget: s(d.budget, 40), neededBy: s(d.neededBy, 40), product: s(d.product), customization: Array.isArray(d.customization) ? d.customization.map((c) => s(c, 40)).slice(0, 10) : [],
    shippingMode: s(d.shippingMode, 40), notes: s(d.notes, 2000), status: "new", userId: request.auth?.uid || null,
    recipients: Array.isArray(d.recipients) ? d.recipients.slice(0, 500).map((r) => ({ name: s(r.name, 80), address: s(r.address, 120), address2: s(r.address2, 60), city: s(r.city, 60), state: s(r.state, 2).toUpperCase(), zipCode: s(r.zipCode, 12), email: s(r.email, 120), note: s(r.note, 140) })).filter((r) => r.name && r.address && r.city && r.state && r.zipCode) : [],
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  if (!quote.name || !quote.email || !quote.company) throw new HttpsError("invalid-argument", "Name, company and email are required.");
  const ref = await db.collection("quotes").add(quote);
  const mail = await Promise.all([
    sendMail({ to: OWNER_EMAIL, subject: `New corporate quote: ${quote.company} (${quote.quantity} units)`, html: `<p><b>${quote.name}</b> at <b>${quote.company}</b> (${quote.email}${quote.phone ? ", " + quote.phone : ""}) requested a quote.</p><ul><li>Quantity: ${quote.quantity}</li><li>Product: ${quote.product}</li><li>Budget/unit: ${quote.budget}</li><li>Needed by: ${quote.neededBy}</li><li>Customization: ${quote.customization.join(", ") || "none"}</li><li>Shipping: ${quote.shippingMode}${quote.recipients.length ? ` · ${quote.recipients.length} recipient addresses attached` : ""}</li></ul><p>${esc(quote.notes)}</p><p><a href="${SITE_URL}/admin/quotes">Open in admin</a></p>` }),
    sendMail({ to: quote.email, subject: "We got your Kind Flames corporate gifting request", html: wrapEmail(`<h2>Thanks, ${esc(quote.name)}.</h2><p>We received your request for <b>${quote.quantity}</b> units for ${esc(quote.company)}. You'll hear from us within one business day with pricing and a mock-up.</p><p>In the meantime, our tiers: 25–49 units 10% off · 50–99 15% off · 100+ 20% off and free design.</p>`) }),
  ]).catch((e) => { console.error("quote mail failed", e.message); return [{ ok: false, reason: e.message }]; });
  await ref.update({ mailStatus: mail }).catch(() => {});
  return { ok: true, id: ref.id, mail };
});

exports.createInvoice = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  requireAdmin(request);
  const { quoteId, lines, daysUntilDue = 30, memo } = request.data || {};
  const qsnap = await db.doc(`quotes/${quoteId}`).get();
  if (!qsnap.exists) throw new HttpsError("not-found", "Quote not found.");
  const q = qsnap.data();
  if (!Array.isArray(lines) || !lines.length) throw new HttpsError("invalid-argument", "Add at least one line.");
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email: q.email, name: q.company, description: q.name, metadata: { quoteId } });
  for (const l of lines) {
    await stripe.invoiceItems.create({ customer: customer.id, currency: "usd", unit_amount: cents(Number(l.unitPrice)), quantity: Math.max(1, parseInt(l.quantity, 10) || 1), description: String(l.description || "Custom order").slice(0, 200) });
  }
  const invoice = await stripe.invoices.create({ customer: customer.id, collection_method: "send_invoice", days_until_due: Math.max(1, parseInt(daysUntilDue, 10) || 30), description: memo ? String(memo).slice(0, 500) : `Kind Flames corporate order for ${q.company}`, metadata: { quoteId } });
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalized.id);
  await qsnap.ref.update({ status: "invoiced", stripeInvoiceId: finalized.id, invoiceUrl: finalized.hosted_invoice_url, invoiceTotal: finalized.total / 100, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true, url: finalized.hosted_invoice_url, total: finalized.total / 100 };
});


/* ----------------------------- subscriptions ------------------------------ */
const PLANS = {
  monthly: { id: "monthly", name: "Candle of the Month", amount: 2400, interval: "month", intervalCount: 1, description: "One 8 oz candle in a new scent every month, free shipping." },
  quarterly: { id: "quarterly", name: "Seasonal Spa Box", amount: 6900, interval: "month", intervalCount: 3, description: "A candle, a bath soak and a lotion every season, free shipping." },
};
exports.listPlans = onCall({ cors: true }, async () => ({ plans: Object.values(PLANS) }));

exports.createSubscriptionCheckout = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const origin = assertOrigin(data.origin);
  const plan = PLANS[data.plan];
  if (!plan) throw new HttpsError("invalid-argument", "Unknown plan.");
  const settings = await getSettings();
  if (IS_PRODUCTION && !settings.cardPaymentsEnabled) throw new HttpsError("failed-precondition", "Subscriptions open once card payments are enabled.");
  const shippingAddress = cleanAddress(data.shippingAddress);
  const email = String(data.email || request.auth.token.email || "").toLowerCase().slice(0, 200);
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: plan.amount, recurring: { interval: plan.interval, interval_count: plan.intervalCount }, product_data: { name: plan.name, description: plan.description } } }],
    success_url: `${origin}/subscribe/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe?cancelled=1`,
    metadata: { uid, plan: plan.id, shippingAddress: JSON.stringify(shippingAddress), preference: String(data.preference || "").slice(0, 60) },
    subscription_data: { metadata: { uid, plan: plan.id } },
  });
  return { url: session.url };
});

async function upsertSubscriptionDoc(sub, extra = {}) {
  const ref = db.doc(`subscriptions/${sub.id}`);
  const existing = await ref.get();
  const doc = {
    stripeSubscriptionId: sub.id, stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    status: sub.status, plan: sub.metadata?.plan || existing.data()?.plan || "monthly", userId: sub.metadata?.uid || existing.data()?.userId || null,
    currentPeriodStart: sub.current_period_start || sub.items?.data?.[0]?.current_period_start || null,
    currentPeriodEnd: sub.current_period_end || sub.items?.data?.[0]?.current_period_end || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end, amount: sub.items?.data?.[0]?.price?.unit_amount ? sub.items.data[0].price.unit_amount / 100 : null,
    updatedAt: FieldValue.serverTimestamp(), ...extra,
  };
  if (!existing.exists) doc.createdAt = FieldValue.serverTimestamp();
  await ref.set(doc, { merge: true });
  return { id: sub.id, ...(existing.exists ? existing.data() : {}), ...doc };
}

exports.verifySubscription = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const { sessionId } = request.data || {};
  if (!sessionId) throw new HttpsError("invalid-argument", "Missing session.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId), { expand: ["subscription"] });
  if (session.metadata?.uid !== uid && !request.auth.token.admin) throw new HttpsError("permission-denied", "Not your subscription.");
  if (session.status !== "complete" || !session.subscription) return { active: false, status: session.status };
  const sub = session.subscription;
  const already = (await db.doc(`subscriptions/${sub.id}`).get()).exists;
  const doc = await upsertSubscriptionDoc(sub, { email: session.customer_details?.email || session.customer_email || null, shippingAddress: JSON.parse(session.metadata.shippingAddress || "{}"), preference: session.metadata.preference || "", userId: uid });
  if (!already) {
    const plan = PLANS[doc.plan] || PLANS.monthly;
    await Promise.all([
      sendMail({ to: doc.email, subject: `Welcome to ${plan.name}`, html: wrapEmail(`<h2>You're in.</h2><p>Your <b>${plan.name}</b> subscription is active. First box ships within 5 business days; after that, on each renewal.</p><p>Manage, pause or cancel any time from <a href="${SITE_URL}/account">your account</a>.</p>`) }),
      sendMail({ to: OWNER_EMAIL, subject: `New subscriber: ${plan.name}`, html: wrapEmail(`<p>${esc(doc.email)} subscribed to ${plan.name}. Preference: ${esc(doc.preference || "none")}.</p><p><a href="${SITE_URL}/admin/subscriptions">Open in admin</a></p>`) }),
    ]).catch((e) => console.error(e.message));
  }
  return { active: ["active", "trialing"].includes(sub.status), subscription: publicSub(doc) };
});

exports.createPortalSession = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const origin = assertOrigin(request.data?.origin);
  const snap = await db.collection("subscriptions").where("userId", "==", uid).limit(1).get();
  if (snap.empty) throw new HttpsError("not-found", "No subscription found.");
  const stripe = getStripe();
  let configuration;
  const configs = await stripe.billingPortal.configurations.list({ limit: 1, active: true });
  if (configs.data.length) configuration = configs.data[0].id;
  else {
    const c = await stripe.billingPortal.configurations.create({ business_profile: { headline: "Kind Flames subscriptions" }, features: { customer_update: { enabled: true, allowed_updates: ["email", "address", "shipping"] }, invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end" } } });
    configuration = c.id;
  }
  const portal = await stripe.billingPortal.sessions.create({ customer: snap.docs[0].data().stripeCustomerId, return_url: `${origin}/account`, configuration });
  return { url: portal.url };
});

exports.syncSubscriptions = onCall({ cors: true, secrets: STRIPE_SECRETS }, async (request) => {
  requireAdmin(request);
  const stripe = getStripe();
  let n = 0;
  for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all", expand: ["data.customer"] })) {
    await upsertSubscriptionDoc(sub, { email: sub.customer?.email || undefined });
    n++;
  }
  return { synced: n };
});

/** Creates one fulfilment order per active subscription for the current billing period (idempotent). */
exports.createSubscriptionShipments = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const { picks } = request.data || {}; // { monthly: [{productId, variantId}], quarterly: [...] }
  const settings = await getSettings();
  const subs = await db.collection("subscriptions").where("status", "in", ["active", "trialing"]).get();
  let created = 0, skipped = 0;
  for (const d of subs.docs) {
    const sub = d.data();
    const periodKey = `${sub.stripeSubscriptionId}:${sub.currentPeriodStart || "na"}`;
    const dup = await db.collection("orders").where("subscriptionPeriodKey", "==", periodKey).limit(1).get();
    if (!dup.empty) { skipped++; continue; }
    const chosen = (picks?.[sub.plan] || []).filter((x) => x?.productId);
    if (!chosen.length) continue;
    const lines = [];
    for (const c of chosen) { const p = await getProduct(c.productId); if (!p) continue; const v = p.variants.find((x) => x.id === c.variantId) || p.variants[0]; lines.push({ productId: p.id, variantId: v.id, name: p.name, variantLabel: v.label, price: v.price, quantity: 1, image: p.images?.[0] || "", lineDiscount: v.price, bundle: null }); }
    if (!lines.length) continue;
    const plan = PLANS[sub.plan] || PLANS.monthly;
    const number = await nextOrderNumber();
    const ref = db.collection("orders").doc();
    const order = {
      number, userId: sub.userId, email: sub.email || "", customerName: sub.shippingAddress?.fullName || sub.email || "Subscriber",
      items: lines, subtotal: round2(lines.reduce((t, l) => t + l.price, 0)), bundleDiscount: 0, discount: { code: null, amount: 0 }, discountTotal: 0, giftWrap: 0,
      shipping: { method: "standard", amount: 0 }, tax: 0, taxRate: 0, total: plan.amount / 100, currency: "usd",
      shippingAddress: sub.shippingAddress || null, gift: { isGift: false, wrap: false, message: "" }, paymentMethod: "subscription", paymentStatus: "paid", status: "paid",
      subscriptionId: sub.stripeSubscriptionId, subscriptionPeriodKey: periodKey, origin: SITE_URL, tracking: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
    };
    await ref.set(order);
    created++;
    if (order.email) await sendMail({ to: order.email, subject: `Your ${plan.name} box is being packed`, html: wrapEmail(`<h2>This period's box</h2><p>${lines.map((l) => esc(l.name) + " (" + esc(l.variantLabel) + ")").join(", ")} is on its way to you within 5 business days. Order ${number}.</p>`) }).catch(() => {});
  }
  void settings;
  return { created, skipped };
});
function publicSub(s) { const { stripeCustomerId, ...rest } = s; return { ...rest, createdAt: null, updatedAt: null }; }

/* --------------------------- scheduled reminders -------------------------- */
exports.abandonedCartReminder = onSchedule({ schedule: "every day 15:00", timeZone: "America/New_York", timeoutSeconds: 300, secrets: PAYMENT_SECRETS }, async () => {
  const now = Date.now();
  const snap = await db.collection("orders").where("status", "==", "pending").orderBy("createdAt", "desc").limit(200).get();
  let sent = 0;
  for (const d of snap.docs) {
    const o = d.data();
    const age = now - (o.createdAt?.toMillis ? o.createdAt.toMillis() : now);
    if (o.reminderSent || !o.email || age < 3600e3 || age > 3 * 864e5) continue;
    if (o.paypalCaptureStatus === "PENDING" || o.stripePaymentStatus === "processing" || o.paymentReview) continue;
    // Never nag someone who paid: ask the provider first (marks the order paid if it is). Skip on any doubt.
    if (o.stripeSessionId || o.paypalOrderId) {
      const check = await reconcileOrder({ id: d.id, ...o }, { captureApproved: false, source: "reminder" }).catch((e) => { console.error("reminder provider check failed", d.id, e.message); return { state: "error" }; });
      if (!["unpaid", "expired", "not_found", "failed", "none"].includes(check.state)) continue;
    }
    if (await marketing.isUnsubscribed(o.email)) { await d.ref.update({ reminderSent: true }); continue; }
    await sendMail({ to: o.email, subject: "Your Kind Flames bag is waiting", html: wrapEmail(`<h2>Still thinking it over?</h2><p>You left ${o.items.map((i) => esc(i.name)).join(", ")} in your bag. It's saved for you.</p><p><a href="${SITE_URL}/checkout">Finish checking out</a> — free shipping over $60.</p>`) }).catch(() => {});
    await d.ref.update({ reminderSent: true });
    sent++;
  }
  console.log(`abandoned cart reminders sent: ${sent}`);
});

async function sendReviewRequest(order) {
  if (!order.email) return;
  const links = order.items.map((i) => `<li><a href="${SITE_URL}/product/${esc(i.productId)}#reviews">${esc(i.name)}</a></li>`).join("");
  return sendMail({ to: order.email, subject: "How was your Kind Flames order?", html: wrapEmail(`<h2>Delivered — how is it?</h2><p>A quick review helps other people pick a scent, and helps us a lot.</p><ul>${links}</ul>`) });
}

/* --------------------------------- email --------------------------------- */
/** Sends via Resend when enabled; otherwise queues in Firestore `mail/` (Trigger Email format). Returns a status summary. */
async function sendMail({ to, subject, html, text, headers }) {
  if (!to) return { ok: false, via: "none", reason: "no recipient" };
  if (ENABLE_RESEND) {
    if (!process.env.RESEND_API_KEY) { console.error("ENABLE_RESEND is true but RESEND_API_KEY is not bound"); return { ok: false, via: "resend", reason: "secret not bound" }; }
    try {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: ENV.REPLY_TO || "hello@kindflames.com", subject, html, text, headers: headers || undefined }) });
      const body = await r.text();
      if (!r.ok) { console.error("resend error", r.status, body); return { ok: false, via: "resend", status: r.status, reason: body.slice(0, 300) }; }
      return { ok: true, via: "resend", id: (() => { try { return JSON.parse(body).id; } catch { return null; } })() };
    } catch (e) { console.error("resend fetch failed", e.message); return { ok: false, via: "resend", reason: e.message }; }
  }
  await db.collection("mail").add({ to, from: FROM_EMAIL, message: { subject, html, text: text || "" }, createdAt: FieldValue.serverTimestamp() });
  return { ok: true, via: "queue" };
}
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function wrapEmail(body) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1E231D"><div style="background:#214238;color:#EAF2EC;padding:18px 24px;font-size:20px;font-weight:700">Kind Flames</div><div style="padding:24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">${body}</div><div style="padding:16px 24px;font-size:12px;color:#6B7266;font-family:Helvetica,Arial,sans-serif">Shamyra Naturals LLC, d/b/a Kind Flames · hello@kindflames.com · (732) 666-8013</div></div>`;
}
function orderTable(order) {
  const rows = order.items.map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} <span style="color:#6B7266">${esc(i.variantLabel)} × ${i.quantity}</span></td><td style="text-align:right">${fmt(i.price * i.quantity - (i.lineDiscount || 0))}</td></tr>`).join("");
  const line = (l, v) => `<tr><td style="padding:4px 0;color:#6B7266">${l}</td><td style="text-align:right">${v}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:14px">${rows}<tr><td colspan="2" style="border-top:1px solid #ddd"></td></tr>${line("Subtotal", fmt(order.subtotal))}${order.discountTotal ? line("Discount", "−" + fmt(order.discountTotal)) : ""}${order.giftWrap ? line("Gift box", fmt(order.giftWrap)) : ""}${line("Shipping", order.shipping.amount ? fmt(order.shipping.amount) : "Free")}${line("Tax", fmt(order.tax))}<tr><td style="padding-top:6px;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${fmt(order.total)}</td></tr></table>`;
}
function addressBlock(a) { return `${esc(a.fullName)}<br>${esc(a.address)}${a.address2 ? "<br>" + esc(a.address2) : ""}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.zipCode)}`; }
async function sendOrderConfirmation(order) {
  if (!order.email) return;
  return sendMail({ to: order.email, subject: `Order ${order.number} confirmed — Kind Flames`, html: wrapEmail(`<h2>Thanks, ${esc(order.customerName.split(" ")[0])}. Your order is in.</h2><p>Order <b>${order.number}</b> is paid. We pack in 1–2 business days and will email you a tracking link when it ships.</p>${orderTable(order)}<p style="margin-top:16px"><b>Ships to</b><br>${addressBlock(order.shippingAddress)}</p>${order.gift?.isGift ? `<p><b>Gift message:</b> ${esc(order.gift.message)}</p>` : ""}<p><a href="${SITE_URL}/account">View your order</a></p>`) });
}
async function sendOwnerNewOrder(order) {
  return sendMail({ to: OWNER_EMAIL, subject: `New order ${order.number} — ${fmt(order.total)} (${order.paymentMethod})`, html: wrapEmail(`<h2>New order ${order.number}</h2><p>${esc(order.customerName)} · ${esc(order.email)}</p>${orderTable(order)}<p><b>Ship to</b><br>${addressBlock(order.shippingAddress)}</p><p><a href="${SITE_URL}/admin/orders">Open in admin</a></p>`) });
}
async function sendShipped(order) {
  if (!order.email) return;
  const t = order.tracking || {};
  return sendMail({ to: order.email, subject: `Order ${order.number} is on its way`, html: wrapEmail(`<h2>Shipped.</h2><p>Your Kind Flames order <b>${order.number}</b> left us today${t.carrier ? ` via ${esc(t.carrier)}` : ""}.</p>${t.number ? `<p>Tracking: <a href="${t.url || "#"}">${esc(t.number)}</a></p>` : ""}<p>Candle tip: trim the wick to ¼″ and let the first burn reach the edge of the jar.</p>`) });
}
function trackingUrl(t) {
  const n = encodeURIComponent(String(t.number || ""));
  const c = String(t.carrier || "").toLowerCase();
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
}
function publicOrder(o) {
  const { payment, internalNotes, ...rest } = o;
  return { ...rest, createdAt: rest.createdAt?.toMillis ? rest.createdAt.toMillis() : rest.createdAt || null, paidAt: rest.paidAt?.toMillis ? rest.paidAt.toMillis() : null, updatedAt: null };
}

/* ------------------------------ marketing email ----------------------------- */
// Flows live in marketing.js: welcome series on newsletter signup, care tips after shipping,
// 45-day reorder nudge, Resend audience sync, one-click unsubscribe (hosting rewrites /api/unsubscribe here).
const marketing = createMarketing({ db, FieldValue, sendMail, wrapEmail, esc, fmt, getProduct, CATALOG, SITE_URL, ENV });

exports.onNewsletterSignup = onDocumentCreated({ document: "newsletter/{email}", secrets: MAIL_SECRETS }, async (event) => {
  const email = event.params.email;
  await marketing.onNewsletterSignup(email, event.data?.data() || {}).catch((e) => console.error("newsletter welcome failed", email, e.message));
});

exports.marketingDrip = onSchedule({ schedule: "every day 10:00", timeZone: "America/New_York", secrets: MAIL_SECRETS }, async () => {
  await marketing.runDrip();
});

exports.unsubscribe = onRequest({ secrets: MAIL_SECRETS }, async (req, res) => {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).send("Method not allowed");
  try { await marketing.handleUnsubscribe(req, res); }
  catch (e) { console.error("unsubscribe failed", e.message); res.status(500).send("Something went wrong. Reply to any Kind Flames email and we'll remove you by hand."); }
});

exports.syncMarketingAudience = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  return marketing.syncAudience();
});

exports.sendMarketingTest = onCall({ cors: true, secrets: MAIL_SECRETS }, async (request) => {
  requireAdmin(request);
  const to = request.auth?.token?.email;
  if (!to) throw new HttpsError("failed-precondition", "Your account has no email address.");
  return marketing.sendTestEmails(to);
});
