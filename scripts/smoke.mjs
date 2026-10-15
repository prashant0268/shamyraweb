// Headless smoke test: loads key routes, records console/page errors, screenshots them.
// Usage: node scripts/smoke.mjs <baseUrl> <outDir> [mobile]
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:4173', out = '/tmp/shots', mode = 'desktop'] = process.argv.slice(2);
const routes = ['/', '/shop', '/shop/body', '/product/lavender-dreams', '/product/brown-sugar-vanilla-scrub', '/build-a-set', '/corporate', '/cart', '/checkout', '/login', '/shipping-returns', '/admin', '/nope'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: mode === 'mobile' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e).slice(0, 300)}`));
page.on('requestfailed', (r) => { if (!/analytics|gtag|google|paypal|doubleclick/.test(r.url())) errors.push(`[reqfail] ${r.url().slice(0, 120)} ${r.failure()?.errorText}`); });
let fails = 0;
for (const r of routes) {
  const before = errors.length;
  try {
    await page.goto(base + r, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(1500);
    const title = await page.title();
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    const vw = await page.evaluate(() => window.innerWidth);
    const overflow = w > vw + 1 ? ` OVERFLOW ${w}>${vw}` : '';
    if (overflow) fails++;
    console.log(`${r.padEnd(38)} title="${title.slice(0, 50)}" h1="${(h1 || '').trim().slice(0, 50)}"${overflow}`);
    await page.screenshot({ path: `${out}/${mode}-${r === '/' ? 'home' : r.slice(1).replace(/\//g, '_')}.png`, fullPage: r === '/' || r.startsWith('/product') });
  } catch (e) { fails++; console.log(`${r.padEnd(38)} FAILED ${String(e).slice(0, 120)}`); }
  for (const e of errors.slice(before)) console.log('   ', e);
}
// Interaction: add to cart from product page, open checkout
try {
  await page.goto(base + '/product/lavender-dreams', { waitUntil: 'load' });
  await page.getByRole('button', { name: /add to bag/i }).first().click();
  await page.waitForTimeout(500);
  const bag = await page.locator('[aria-label^="Bag,"]').textContent().catch(() => '');
  console.log('after add-to-bag, bag count label:', bag?.trim());
  await page.screenshot({ path: `${out}/${mode}-cart-drawer.png` });
  await page.goto(base + '/checkout', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${mode}-checkout-with-item.png`, fullPage: true });
  const totals = await page.locator('aside').textContent().catch(() => '');
  console.log('checkout aside:', (totals || '').replace(/\s+/g, ' ').slice(0, 300));
} catch (e) { fails++; console.log('interaction FAILED', String(e).slice(0, 200)); }
await browser.close();
console.log(fails ? `SMOKE: ${fails} problem(s)` : 'SMOKE: OK');
