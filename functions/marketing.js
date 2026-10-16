/**
 * Marketing email flows (task #9): Resend audience sync, welcome series, post-purchase care tips,
 * 45-day reorder nudge, and one-click unsubscribe.
 *
 * State lives in Firestore `marketing/{email}` (server-written, admin-readable):
 *   { email, firstName, source: 'newsletter'|'order', token, unsubscribed, welcomeStage: 0..3,
 *     welcomeAt, lastOrderAt, resend: { contactId, syncedAt }, createdAt, updatedAt }
 * Per-order flags on `orders/{id}`: shippedAt, careSent, reorderSent.
 * Resend audience id: env RESEND_AUDIENCE_ID, else created once and stored in `system/marketing`.
 *
 * The pure selectors (`welcomeStepDue`, `orderActionsDue`) hold all the timing rules and are unit tested
 * in scripts/test-marketing-unit.mjs.
 */
const crypto = require("crypto");

const DAY = 864e5;
const WELCOME_CODE = "WELCOME10";
const TIMING = {
  welcome2AfterDays: 3, // after welcome #1
  welcome3AfterDays: 4, // after welcome #2
  careAfterShippedDays: 2,
  careMaxDays: 21,
  reorderAfterDays: 45,
  reorderMaxDays: 60,
};
const ACTIVE_ORDER_STATUSES = ["paid", "fulfilled", "shipped", "delivered"];

/* ------------------------------ pure selectors ----------------------------- */
const ms = (t) => (t == null ? null : typeof t === "number" ? t : t.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : null);

/** Which welcome email (2 or 3) a marketing doc is due for, or null. */
function welcomeStepDue(doc, now = Date.now()) {
  if (!doc || doc.unsubscribed || doc.source !== "newsletter") return null;
  const since = ms(doc.welcomeAt);
  if (since == null) return null;
  const days = (now - since) / DAY;
  if (doc.welcomeStage === 1 && days >= TIMING.welcome2AfterDays) return 2;
  if (doc.welcomeStage === 2 && days >= TIMING.welcome3AfterDays) return 3;
  return null;
}

/**
 * Given recent orders (last ~60 days), returns the care / reorder emails that are due.
 * - care: shipped or delivered, shippedAt 2–21 days ago, not yet sent
 * - reorder: paid 45–60 days ago, not yet sent, and no newer paid order from the same email
 * `isUnsubscribed(email)` filters out opted-out customers.
 */
function orderActionsDue(orders, now = Date.now(), isUnsubscribed = () => false) {
  const latestPaidByEmail = new Map();
  for (const o of orders) {
    if (!o.email || !ACTIVE_ORDER_STATUSES.includes(o.status)) continue;
    const paid = ms(o.paidAt);
    if (paid == null) continue;
    const cur = latestPaidByEmail.get(o.email);
    if (cur == null || paid > cur) latestPaidByEmail.set(o.email, paid);
  }
  const actions = [];
  for (const o of orders) {
    if (!o.email || !ACTIVE_ORDER_STATUSES.includes(o.status) || isUnsubscribed(o.email)) continue;
    const shipped = ms(o.shippedAt);
    if (!o.careSent && shipped != null && ["shipped", "delivered"].includes(o.status)) {
      const days = (now - shipped) / DAY;
      if (days >= TIMING.careAfterShippedDays && days <= TIMING.careMaxDays) actions.push({ type: "care", order: o });
    }
    const paid = ms(o.paidAt);
    if (!o.reorderSent && paid != null && o.paymentMethod !== "subscription") {
      const days = (now - paid) / DAY;
      const isLatest = latestPaidByEmail.get(o.email) === paid;
      if (isLatest && days >= TIMING.reorderAfterDays && days <= TIMING.reorderMaxDays) actions.push({ type: "reorder", order: o });
    }
  }
  return actions;
}

/* --------------------------------- factory -------------------------------- */
function createMarketing({ db, FieldValue, sendMail, wrapEmail, esc, fmt, getProduct, CATALOG, SITE_URL, ENV = process.env }) {
  const norm = (e) => String(e || "").trim().toLowerCase().slice(0, 200);
  const firstNameOf = (s) => String(s || "").trim().split(/\s+/)[0] || "";
  const docRef = (email) => db.doc(`marketing/${norm(email)}`);
  const button = (href, label) => `<p style="margin:20px 0"><a href="${href}" style="background:#214238;color:#EAF2EC;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;display:inline-block">${label}</a></p>`;
  const productLink = (id, name) => `<a href="${SITE_URL}/product/${esc(id)}" style="color:#214238">${esc(name)}</a>`;

  function unsubscribeUrl(doc) { return `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(doc.email)}&t=${encodeURIComponent(doc.token)}`; }
  function footer(doc) {
    return `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e7e3;font-size:12px;color:#6B7266">You're getting this because you joined the Kind Flames list or ordered from us. <a href="${unsubscribeUrl(doc)}" style="color:#6B7266">Unsubscribe</a> any time.</p>`;
  }

  /** Create or update the marketing doc for an email. Never flips `unsubscribed` back to false. */
  async function upsertContact({ email, firstName, source, lastOrderAt, startWelcome }) {
    email = norm(email);
    if (!email || !email.includes("@")) return null;
    const ref = docRef(email);
    const snap = await ref.get();
    const now = FieldValue.serverTimestamp();
    if (!snap.exists) {
      const doc = {
        email, firstName: firstName || "", source, token: crypto.randomBytes(16).toString("hex"), unsubscribed: false,
        welcomeStage: startWelcome ? 0 : 3, welcomeAt: null, lastOrderAt: lastOrderAt || null, resend: null, createdAt: now, updatedAt: now,
      };
      await ref.set(doc);
      return { ...doc, isNew: true };
    }
    const cur = snap.data();
    const patch = { updatedAt: now };
    if (firstName && !cur.firstName) patch.firstName = firstName;
    if (lastOrderAt) patch.lastOrderAt = lastOrderAt;
    if (Object.keys(patch).length > 1) await ref.update(patch);
    return { ...cur, ...patch, isNew: false };
  }

  /* ------------------------------ Resend audience ----------------------------- */
  const resendHeaders = () => ({ Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json" });
  const AUDIENCE_NAME = "Kind Flames customers";
  // Never touch the real Resend audience from the emulator (secrets are still loaded there).
  const resendEnabled = () => !!ENV.RESEND_API_KEY && ENV.FUNCTIONS_EMULATOR !== "true";
  async function getAudienceId() {
    if (ENV.RESEND_AUDIENCE_ID) return ENV.RESEND_AUDIENCE_ID;
    if (!resendEnabled()) return null;
    const sysRef = db.doc("system/marketing");
    const sys = await sysRef.get();
    if (sys.exists && sys.data().audienceId) return sys.data().audienceId;
    try {
      // Reuse an audience of the same name before creating one (idempotent across redeploys / fresh databases).
      const list = await fetch("https://api.resend.com/audiences", { headers: resendHeaders() });
      const existing = list.ok ? ((await list.json()).data || []).find((a) => a.name === AUDIENCE_NAME) : null;
      let id = existing?.id || null;
      if (!id) {
        const r = await fetch("https://api.resend.com/audiences", { method: "POST", headers: resendHeaders(), body: JSON.stringify({ name: AUDIENCE_NAME }) });
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.id) { console.error("resend audience create failed", r.status, JSON.stringify(body).slice(0, 200)); return null; }
        id = body.id;
      }
      await sysRef.set({ audienceId: id, createdAt: FieldValue.serverTimestamp() }, { merge: true });
      return id;
    } catch (e) { console.error("resend audience lookup failed", e.message); return null; }
  }
  /** Upsert one contact in the Resend audience. Returns the contact id or null; never throws. */
  async function syncContactToResend(doc, audienceId) {
    if (!audienceId || !resendEnabled()) return null;
    try {
      const payload = { email: doc.email, first_name: doc.firstName || undefined, unsubscribed: !!doc.unsubscribed };
      let r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, { method: "POST", headers: resendHeaders(), body: JSON.stringify(payload) });
      if (!r.ok) r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(doc.email)}`, { method: "PATCH", headers: resendHeaders(), body: JSON.stringify({ first_name: payload.first_name, unsubscribed: payload.unsubscribed }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { console.error("resend contact sync failed", doc.email, r.status, JSON.stringify(body).slice(0, 200)); return null; }
      const contactId = body.id || doc.resend?.contactId || null;
      await docRef(doc.email).set({ resend: { contactId, syncedAt: FieldValue.serverTimestamp() } }, { merge: true });
      return contactId;
    } catch (e) { console.error("resend contact sync error", e.message); return null; }
  }

  /* --------------------------------- content --------------------------------- */
  async function welcomeCode() {
    const snap = await db.doc(`discounts/${WELCOME_CODE}`).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.active === false) return null;
    const exp = ms(d.expiresAt);
    if (exp != null && exp < Date.now()) return null;
    return { code: WELCOME_CODE, value: d.value, type: d.type };
  }
  const codeLine = (c) => (c ? `<p>Use <b style="letter-spacing:.04em">${c.code}</b> at checkout for ${c.type === "percent" ? `${c.value}% off` : fmt(c.value) + " off"} your first order.</p>` : "");

  async function bestsellers(n = 3) {
    try {
      const snap = await db.collection("products").where("active", "==", true).orderBy("sortOrder").limit(12).get();
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pick = list.filter((p) => p.category === "candle" && !p.hidden).slice(0, n);
      if (pick.length) return pick;
    } catch (e) { /* fall back to bundled catalog */ }
    return CATALOG.filter((p) => p.category === "candle" && !p.hidden && p.active !== false).slice(0, n);
  }
  const productList = (ps) => `<ul style="padding-left:18px">${ps.map((p) => `<li style="margin:4px 0">${productLink(p.id, p.name)}${p.family ? ` <span style="color:#6B7266">· ${esc(p.family)}</span>` : ""}</li>`).join("")}</ul>`;

  const greet = (doc) => (doc.firstName ? `Hi ${esc(doc.firstName)},` : "Hi there,");

  async function welcome1(doc) {
    const c = await welcomeCode();
    return {
      subject: c ? `Welcome to Kind Flames — ${c.type === "percent" ? `${c.value}%` : fmt(c.value)} off inside` : "Welcome to Kind Flames",
      html: `<h2>Welcome in.</h2><p>${greet(doc)}</p><p>Thanks for joining. We hand-pour small batches of soy candles in New Jersey, and make the body scrubs, lotions and bath salts that go with them. No dyes, cotton wicks, and scents built to fill a room without taking it over.</p>${codeLine(c)}<p>A good place to start:</p>${button(`${SITE_URL}/shop`, "Shop the collection")}<p>Or build your own spa set — one candle, two bath items, 15% off the lot: <a href="${SITE_URL}/build-a-set" style="color:#214238">Build a set</a>.</p>`,
    };
  }
  async function welcome2(doc) {
    const ps = await bestsellers(3);
    return {
      subject: "How a Kind Flames candle gets made",
      html: `<h2>Slow wax, patient wicks.</h2><p>${greet(doc)}</p><p>Every candle starts as a pot of soy wax warmed to the same temperature, every time. Fragrance goes in at the moment the wax will hold it, then it's poured by hand and left alone for two weeks so the scent settles into the wax instead of sitting on top. That cure is why the first burn smells like the twentieth.</p><p>The ones people come back for:</p>${productList(ps)}${button(`${SITE_URL}/shop`, "See all scents")}<p style="color:#6B7266;font-size:13px">Burn tip: let the first burn go until the melt pool reaches the edge of the jar. It stops tunnelling for the life of the candle.</p>`,
    };
  }
  async function welcome3(doc) {
    const c = await welcomeCode();
    return {
      subject: c ? `Your ${c.type === "percent" ? `${c.value}%` : fmt(c.value)} off is still waiting` : "Gifts that feel like a warm room",
      html: `<h2>Still here when you're ready.</h2><p>${greet(doc)}</p>${c ? `<p>Your welcome code <b style="letter-spacing:.04em">${c.code}</b> still works on a first order.</p>` : ""}<p>If you're shopping for someone else, the <a href="${SITE_URL}/gifts" style="color:#214238">holiday gift guide</a> is sorted by budget and by who it's for. Gift wrap and a handwritten note are a $5 add-on at checkout, and shipping is free over $60.</p>${button(`${SITE_URL}/gifts`, "Open the gift guide")}<p>For yourself: <a href="${SITE_URL}/build-a-set" style="color:#214238">build a spa set</a> and save 15%.</p>`,
    };
  }

  const CARE = {
    candle: `<h3 style="margin-bottom:4px">Your candle</h3><ul style="padding-left:18px;margin-top:4px"><li>First burn: 2–3 hours, until the melt pool reaches the glass. This sets the memory of the wax.</li><li>Trim the wick to ¼″ before every light. A long wick smokes and burns hot.</li><li>Keep burns under 4 hours and stop when ½″ of wax is left; the glass gets hot below that.</li><li>Soy wax can look frosted or uneven after cooling. That's the wax, not a fault, and it burns the same.</li></ul>`,
    scrub: `<h3 style="margin-bottom:4px">Your body scrub</h3><ul style="padding-left:18px;margin-top:4px"><li>Use 2–3 times a week on damp skin, in small circles, then rinse. Skip the day you shave.</li><li>Scoop with dry hands or a spoon; water in the jar shortens its life.</li><li>Oils will separate a little. Stir and go.</li></ul>`,
    lotion: `<h3 style="margin-bottom:4px">Your lotion</h3><ul style="padding-left:18px;margin-top:4px"><li>Best right after a shower while skin is still slightly damp.</li><li>A little goes a long way; warm it between your palms first.</li><li>Store away from direct sun and heat.</li></ul>`,
    salt: `<h3 style="margin-bottom:4px">Your bath salts</h3><ul style="padding-left:18px;margin-top:4px"><li>Half a cup under running warm water, then soak 15–20 minutes.</li><li>Keep the lid tight; the salts draw moisture from the air.</li><li>Drink a glass of water after a long soak.</li></ul>`,
  };
  async function categoriesFor(order) {
    const cats = new Set();
    for (const i of order.items || []) {
      const p = await getProduct(i.productId).catch(() => null);
      if (!p) continue;
      if (p.category === "set") { ["candle", "scrub", "salt"].forEach((c) => cats.add(c)); continue; }
      if (CARE[p.category]) cats.add(p.category);
    }
    if (!cats.size) cats.add("candle");
    return [...cats];
  }
  async function care(doc, order) {
    const cats = await categoriesFor(order);
    return {
      subject: "Getting the most out of your Kind Flames order",
      html: `<h2>A few notes before you light up.</h2><p>${greet(doc)}</p><p>Order <b>${esc(order.number)}</b> should be with you now. Here's how to get the most out of what's in the box.</p>${cats.map((c) => CARE[c]).join("")}<p>Questions, or something arrived broken? Reply to this email and we'll sort it out.</p>`,
    };
  }
  async function reorder(doc, order) {
    const items = (order.items || []).filter((i) => i.productId !== "corporate-sample-kit");
    const hasCandle = (await categoriesFor(order)).includes("candle");
    return {
      subject: "Running low?",
      html: `<h2>About six weeks in.</h2><p>${greet(doc)}</p><p>That's roughly when a Kind Flames candle burns its last hour and a scrub jar scrapes the bottom. If you're there, here's what you ordered last time:</p><ul style="padding-left:18px">${items.map((i) => `<li style="margin:4px 0">${productLink(i.productId, i.name)} <span style="color:#6B7266">${esc(i.variantLabel || "")}</span></li>`).join("")}</ul>${button(`${SITE_URL}/shop`, "Reorder")}${hasCandle ? `<p>Or never run out: <a href="${SITE_URL}/subscribe" style="color:#214238">Candle of the Month</a> lands on your doorstep with free shipping, and you can pause any time.</p>` : ""}<p style="color:#6B7266;font-size:13px">Free shipping on orders over $60.</p>`,
    };
  }

  /* --------------------------------- sending --------------------------------- */
  async function sendMarketing(doc, { subject, html }) {
    if (!doc || doc.unsubscribed) return { ok: false, reason: "unsubscribed" };
    const url = unsubscribeUrl(doc);
    return sendMail({ to: doc.email, subject, html: wrapEmail(html + footer(doc)), headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
  }

  /* ---------------------------------- flows ---------------------------------- */
  /** Newsletter signup: create contact, send welcome #1, sync to Resend. */
  async function onNewsletterSignup(email, data = {}) {
    const doc = await upsertContact({ email, source: "newsletter", startWelcome: true });
    if (!doc || doc.unsubscribed) return;
    if (doc.welcomeStage === 0) {
      const r = await sendMarketing(doc, await welcome1(doc));
      await docRef(doc.email).update({ welcomeStage: 1, welcomeAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      console.log("welcome #1", doc.email, JSON.stringify(r));
    }
    const audienceId = await getAudienceId();
    await syncContactToResend({ ...doc, source: data.source || "newsletter" }, audienceId);
  }

  /** Paid order: make sure the customer is a contact (no welcome series) and synced. */
  async function onOrderPaid(order) {
    const doc = await upsertContact({ email: order.email, firstName: firstNameOf(order.customerName), source: "order", lastOrderAt: FieldValue.serverTimestamp() });
    if (!doc) return;
    const audienceId = await getAudienceId();
    await syncContactToResend(doc, audienceId);
  }

  /** Daily drip: welcome #2/#3, care tips, reorder nudges. Returns counts. */
  async function runDrip(now = Date.now()) {
    const counts = { welcome2: 0, welcome3: 0, care: 0, reorder: 0, skipped: 0 };
    // Welcome series
    const due = await db.collection("marketing").where("welcomeStage", "in", [1, 2]).limit(500).get();
    for (const d of due.docs) {
      const doc = { id: d.id, ...d.data() };
      const step = welcomeStepDue(doc, now);
      if (!step) continue;
      const content = step === 2 ? await welcome2(doc) : await welcome3(doc);
      const r = await sendMarketing(doc, content);
      await d.ref.update({ welcomeStage: step, welcomeAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      if (r.ok) counts[`welcome${step}`]++; else counts.skipped++;
    }
    // Orders: one scan of the last 60 days covers care + reorder
    const since = new Date(now - TIMING.reorderMaxDays * DAY);
    const recent = await db.collection("orders").where("paidAt", ">=", since).limit(1000).get();
    const orders = recent.docs.map((d) => ({ id: d.id, ...d.data() }));
    const emails = [...new Set(orders.map((o) => o.email).filter(Boolean))];
    const docs = new Map();
    for (let i = 0; i < emails.length; i += 100) {
      const snaps = await db.getAll(...emails.slice(i, i + 100).map((e) => docRef(e)));
      snaps.forEach((s) => { if (s.exists) docs.set(s.id, { id: s.id, ...s.data() }); });
    }
    const isUnsub = (e) => docs.get(norm(e))?.unsubscribed === true;
    for (const { type, order } of orderActionsDue(orders, now, isUnsub)) {
      let doc = docs.get(norm(order.email));
      if (!doc) { doc = await upsertContact({ email: order.email, firstName: firstNameOf(order.customerName), source: "order" }); docs.set(doc.email, doc); }
      const content = type === "care" ? await care(doc, order) : await reorder(doc, order);
      const r = await sendMarketing(doc, content);
      await db.doc(`orders/${order.id}`).update(type === "care" ? { careSent: true } : { reorderSent: true });
      if (r.ok) counts[type]++; else counts.skipped++;
    }
    console.log("marketing drip", JSON.stringify(counts));
    return counts;
  }

  /** HTTP handler for /api/unsubscribe (GET link in the email, POST for one-click). */
  async function handleUnsubscribe(req, res) {
    const email = norm(req.query.e || req.body?.e);
    const token = String(req.query.t || req.body?.t || "");
    const page = (title, text) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Kind Flames</title><body style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#1E231D"><h1 style="font-family:Georgia,serif;color:#214238">${title}</h1><p style="font-size:16px;line-height:1.5">${text}</p><p><a href="${SITE_URL}" style="color:#214238">Back to kindflames.com</a></p></body>`;
    if (!email || !token) return res.status(400).send(page("That link is incomplete", "Open the unsubscribe link from the bottom of a Kind Flames email, or reply to any email and we'll remove you by hand."));
    const ref = docRef(email);
    const snap = await ref.get();
    if (!snap.exists || snap.data().token !== token) return res.status(400).send(page("That link didn't match", "Reply to any Kind Flames email and we'll remove you by hand."));
    if (!snap.data().unsubscribed) {
      await ref.update({ unsubscribed: true, unsubscribedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      const audienceId = await getAudienceId();
      await syncContactToResend({ ...snap.data(), unsubscribed: true }, audienceId);
    }
    return res.status(200).send(page("You're unsubscribed", `${esc(email)} won't get marketing email from Kind Flames. You'll still get receipts and shipping updates for anything you order.`));
  }

  /** Admin: backfill contacts from newsletter + paid orders and push them all to the Resend audience. */
  async function syncAudience() {
    const result = { newsletter: 0, orders: 0, contacts: 0, synced: 0, failed: 0, audienceId: null };
    const news = await db.collection("newsletter").get();
    for (const d of news.docs) { const r = await upsertContact({ email: d.id, source: "newsletter", startWelcome: false }); if (r) result.newsletter++; }
    const orders = await db.collection("orders").where("status", "in", ACTIVE_ORDER_STATUSES).limit(2000).get();
    const seen = new Set();
    for (const d of orders.docs) {
      const o = d.data();
      const e = norm(o.email);
      if (!e || seen.has(e)) continue;
      seen.add(e);
      const r = await upsertContact({ email: e, firstName: firstNameOf(o.customerName), source: "order", lastOrderAt: o.paidAt || null });
      if (r) result.orders++;
    }
    result.audienceId = await getAudienceId();
    const all = await db.collection("marketing").get();
    result.contacts = all.size;
    if (result.audienceId) {
      for (const d of all.docs) { const id = await syncContactToResend({ id: d.id, ...d.data() }, result.audienceId); if (id) result.synced++; else result.failed++; }
    }
    return result;
  }

  /** Admin: send every template to one address so the owner can read them. */
  async function sendTestEmails(to) {
    const doc = { email: norm(to), firstName: "Prashant", token: "test", unsubscribed: false, source: "newsletter" };
    const sampleOrder = (await db.collection("orders").where("status", "in", ACTIVE_ORDER_STATUSES).orderBy("paidAt", "desc").limit(1).get().catch(() => ({ docs: [] }))).docs[0];
    const order = sampleOrder ? { id: sampleOrder.id, ...sampleOrder.data() } : { number: "KF-TEST", items: CATALOG.filter((p) => !p.hidden).slice(0, 2).map((p) => ({ productId: p.id, name: p.name, variantLabel: p.variants?.[0]?.label || "" })) };
    const sent = [];
    for (const [name, make] of [["welcome1", () => welcome1(doc)], ["welcome2", () => welcome2(doc)], ["welcome3", () => welcome3(doc)], ["care", () => care(doc, order)], ["reorder", () => reorder(doc, order)]]) {
      const c = await make();
      const r = await sendMarketing(doc, { ...c, subject: `[test ${name}] ${c.subject}` });
      sent.push({ name, ok: !!r.ok, reason: r.reason || null });
    }
    return { sent };
  }

  async function isUnsubscribed(email) { const s = await docRef(email).get(); return s.exists && s.data().unsubscribed === true; }

  return { onNewsletterSignup, onOrderPaid, runDrip, handleUnsubscribe, syncAudience, sendTestEmails, isUnsubscribed, upsertContact };
}

module.exports = { createMarketing, welcomeStepDue, orderActionsDue, TIMING, DAY };
