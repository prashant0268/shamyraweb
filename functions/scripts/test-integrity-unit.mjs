// Unit tests for functions/integrity.js (abuse protection + data integrity helpers). No Firestore needed.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../integrity.js');

let fails = 0, n = 0;
const check = (name, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };

/* email */
check('cleanEmail lowercases + trims', I.cleanEmail('  Jane@Example.COM '), 'jane@example.com');
check('cleanEmail rejects header injection', I.cleanEmail('a@b.com\r\nBcc: x@y.com'), '');
check('cleanEmail rejects no domain dot', I.cleanEmail('a@localhost'), '');
check('cleanEmail rejects angle brackets', I.cleanEmail('<a@b.com>'), '');
check('cleanEmail rejects slash (doc-id safety)', I.cleanEmail('a/b@c.com'), '');
check('normalizeEmail gmail dots + tag', I.normalizeEmail('J.a.n.e+promo@Gmail.com'), 'jane@gmail.com');
check('normalizeEmail googlemail → gmail', I.normalizeEmail('jane@googlemail.com'), 'jane@gmail.com');
check('normalizeEmail keeps dots elsewhere, strips tag', I.normalizeEmail('first.last+x@example.com'), 'first.last@example.com');
check('normalizeEmail garbage', I.normalizeEmail('nope'), '');

/* throttle */
const H = 3600e3;
let st = null; const results = [];
for (let i = 0; i < 4; i++) { const r = I.rateWindow(st, 1000 + i, 3, H); st = r.state; results.push(r.allowed); }
check('rateWindow allows 3 then blocks', results, [true, true, true, false]);
check('rateWindow resets after window', I.rateWindow(st, 1000 + H, 3, H), { allowed: true, state: { windowStart: 1000 + H, count: 1 } });
check('rateWindow tolerates junk state', I.rateWindow({ windowStart: 'x' }, 5, 1, H).allowed, true);
check('clientIp takes last XFF hop', I.clientIp({ headers: { 'x-forwarded-for': '6.6.6.6, 1.2.3.4' }, ip: '9.9.9.9' }), '1.2.3.4');
check('clientIp falls back to req.ip', I.clientIp({ headers: {}, ip: '9.9.9.9' }), '9.9.9.9');

/* email safety */
check('esc escapes html + quotes', I.esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
check('esc handles null/number', [I.esc(null), I.esc(0)], ['', '0']);
check('oneLine strips CR/LF', I.oneLine('Acme\r\nBcc: evil@x.com (25 units)'), 'Acme Bcc: evil@x.com (25 units)');

/* discount capacity */
check('capacity: no limit', I.discountHasCapacity({ usageCount: 99 }), true);
check('capacity: used + reserved at limit', I.discountHasCapacity({ usageLimit: 5, usageCount: 3, reservedCount: 2 }), false);
check('capacity: room left', I.discountHasCapacity({ usageLimit: 5, usageCount: 3, reservedCount: 1 }), true);
check('capacity: negative reservedCount ignored', I.discountHasCapacity({ usageLimit: 1, usageCount: 1, reservedCount: -3 }), false);

/* stock */
const products = {
  a: { name: 'Lavender', variants: [{ id: '8oz', stock: 5 }, { id: '16oz', stock: 1 }, { id: 'nolimit' }] },
  b: { name: 'Cedar', variants: [{ id: '8oz', stock: 0 }] },
};
let plan = I.planStockDecrement(products, [{ productId: 'a', variantId: '8oz', quantity: 2 }, { productId: 'a', variantId: '8oz', quantity: 1 }, { productId: 'a', variantId: 'nolimit', quantity: 9 }, { productId: 'ghost', variantId: 'x', quantity: 1 }]);
check('decrement: two lines same variant accumulate', plan.variantsByProduct.a.find((v) => v.id === '8oz').stock, 2);
check('decrement: untracked stock untouched, missing product skipped', [plan.variantsByProduct.a.find((v) => v.id === 'nolimit').stock, plan.decremented.length, plan.oversold.length], [undefined, 2, 0]);
check('decrement: input not mutated', products.a.variants[0].stock, 5);
plan = I.planStockDecrement(products, [{ productId: 'a', variantId: '16oz', quantity: 3, name: 'Lavender' }, { productId: 'b', variantId: '8oz', quantity: 1 }]);
check('oversold: flagged, stock floors at 0, only available units recorded as taken', [plan.oversold, plan.decremented, plan.variantsByProduct.a.find((v) => v.id === '16oz').stock],
  [[{ productId: 'a', variantId: '16oz', name: 'Lavender', ordered: 3, available: 1 }, { productId: 'b', variantId: '8oz', name: 'Cedar', ordered: 1, available: 0 }], [{ productId: 'a', variantId: '16oz', quantity: 1 }], 0]);
check('restock adds back exactly what was taken', I.planRestock(products, [{ productId: 'a', variantId: '16oz', quantity: 1 }, { productId: 'a', variantId: '8oz', quantity: 2 }]).a.map((v) => v.stock), [7, 2, undefined]);
check('back in stock: 0 → 3 only', I.variantsBackInStock({ variants: [{ id: 'x', stock: 0 }, { id: 'y', stock: 2 }, { id: 'z' }] }, { variants: [{ id: 'x', stock: 3 }, { id: 'y', stock: 5 }, { id: 'z', stock: 4 }] }), ['x']);
check('back in stock: still 0', I.variantsBackInStock({ variants: [{ id: 'x', stock: 0 }] }, { variants: [{ id: 'x', stock: 0 }] }), []);
check('low stock: below threshold, active only, sorted', I.lowStockVariants([
  { id: 'p1', name: 'P1', variants: [{ id: 'a', label: 'A', stock: 4 }, { id: 'b', label: 'B', stock: 5 }, { id: 'c', label: 'C', stock: 0 }] },
  { id: 'p2', name: 'P2', active: false, variants: [{ id: 'a', stock: 0 }] },
], 5).map((l) => `${l.productId}/${l.variantId}:${l.stock}`), ['p1/c:0', 'p1/a:4']);

/* refunds */
check('refund default = remaining, full', I.planRefund({ total: 40.5 }, null), { amount: 40.5, remaining: 0, full: true });
check('refund partial', I.planRefund({ total: 40.5 }, 10), { amount: 10, remaining: 30.5, full: false });
check('refund remainder after partial completes it', I.planRefund({ total: 40.5, refundedTotal: 10 }, 30.5), { amount: 30.5, remaining: 0, full: true });
check('refund over remaining rejected', I.planRefund({ total: 40.5, refundedTotal: 10 }, 31).error, 'You can refund at most $30.50 on this order.');
check('refund zero/negative rejected', [I.planRefund({ total: 10 }, 0).error, I.planRefund({ total: 10 }, -5).error, I.planRefund({ total: 10 }, 'abc').error], ['Enter a refund amount greater than $0.', 'Enter a refund amount greater than $0.', 'Enter a refund amount greater than $0.']);
check('refund on fully refunded order rejected', I.planRefund({ total: 10, refundedTotal: 10 }, null).error, 'This order has already been fully refunded.');
check('refund rounds to cents', I.planRefund({ total: 10 }, 3.333).amount, 3.33);

/* reviews */
check('clampRating', [I.clampRating(7), I.clampRating(0), I.clampRating(3.6), I.clampRating('4'), I.clampRating('x')], [5, 1, 4, 4, null]);
check('verified: paid order with product', I.ordersContainProduct([{ status: 'pending', items: [{ productId: 'a' }] }, { status: 'shipped', items: [{ productId: 'a' }] }], 'a'), true);
check('verified: only unpaid/refunded orders', I.ordersContainProduct([{ status: 'pending', items: [{ productId: 'a' }] }, { status: 'refunded', items: [{ productId: 'a' }] }], 'a'), false);
check('verified: paid order without product', I.ordersContainProduct([{ status: 'paid', items: [{ productId: 'b' }] }], 'a'), false);

console.log(fails ? `INTEGRITY UNIT TESTS: ${fails}/${n} failed` : `INTEGRITY UNIT TESTS: all ${n} passed`);
process.exit(fails ? 1 : 0);
