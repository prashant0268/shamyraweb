// Screenshots the home and product page in every storefront theme (plus the welcome popup and mega menu).
// Usage: node scripts/theme-shots.mjs <baseUrl> <outDir>   e.g. against `vite preview` on http://127.0.0.1:4173
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const theme of ['hearth', 'atelier', 'noir', 'sunroom', 'apothecary']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('kf_popup_seen', String(Date.now())); } catch {} });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${base}/?theme=${theme}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  for (let y = 0; y < 6000; y += 700) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(250); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/theme-${theme}-home.png`, fullPage: true });
  await page.goto(`${base}/product/lavender-dreams`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/theme-${theme}-pdp.png` });
  if (theme === 'hearth') { await page.goto(`${base}/?popup=on`, { waitUntil: 'load' }); await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/popup.png` }); await page.goto(`${base}/`, { waitUntil: 'load' }); await page.waitForTimeout(800); await page.hover('nav[aria-label="Main"] a[href="/shop"]'); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/mega.png` }); }
  console.log(theme, errs.length ? errs : 'ok');
  await ctx.close();
}
await browser.close();
