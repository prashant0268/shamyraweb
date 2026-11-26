// Mobile lab Web Vitals (CLS, LCP) with playwright-core: Moto-G-ish viewport, 4x CPU slowdown, "fast 4G".
// Usage: node scripts/vitals.mjs [baseUrl] [runs]   (serve dist with `vite preview --host 127.0.0.1 --port 4173`)
import { chromium } from 'playwright-core';
const [base = 'http://127.0.0.1:4173', runsArg = '3'] = process.argv.slice(2);
const RUNS = Number(runsArg) || 3;
const routes = ['/', '/shop', '/shop/candle', '/product/lavender-dreams', '/product/brown-sugar-vanilla-scrub'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const rows = [];
for (const r of routes) {
  const cls = [], lcp = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('kf_popup_seen', String(Date.now())); localStorage.setItem('kf_consent', JSON.stringify({ v: 1, analytics: false, ads: false, ts: Date.now() })); } catch { /* ignore */ }
      window.__cls = 0; window.__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { const es = l.getEntries(); const last = es[es.length - 1]; if (last) window.__lcp = last.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(base + r, { waitUntil: 'load', timeout: 60000 });
    // LCP can land long after onload on a throttled link (a big hero photo): wait for the network to go quiet.
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const v = await page.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp }));
    cls.push(v.cls); lcp.push(v.lcp);
    await ctx.close();
  }
  rows.push({ route: r, cls: median(cls).toFixed(3), lcpMs: Math.round(median(lcp)) });
}
await browser.close();
console.table(rows);
