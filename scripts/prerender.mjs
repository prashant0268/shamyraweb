// Build-time prerender. Runs after `vite build` (see package.json "postbuild"):
//   1. keeps the plain SPA shell as dist/spa.html (Hosting rewrites client-only routes like /checkout to it),
//   2. loads every public route (scripts/routes.mjs) in headless Chrome with window.__KF_PRERENDER__ = true,
//   3. writes dist/<route>/index.html with the rendered markup plus that route's <title>, description, canonical,
//      Open Graph / Twitter tags, JSON-LD and image preloads, so crawlers and first paint get real HTML,
//   4. writes dist/404.html (served by Hosting with a real 404 status for unknown paths),
//   5. checks every inline <script> in the shell is allowed by a sha256 hash in firebase.json's CSP.
// The app then mounts with createRoot over the static markup (same layout, so no shift).
// Usage: node scripts/prerender.mjs [distDir]      Env: CHROME_PATH to use a specific Chrome binary.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { publicRoutes, root } from './routes.mjs';

const dist = resolve(root, process.argv[2] || 'dist');
const shellPath = join(dist, 'index.html');
if (!existsSync(shellPath)) { console.error(`prerender: ${shellPath} not found; run vite build first`); process.exit(1); }
// Re-running on an already prerendered dist: start again from the saved shell.
const shell = existsSync(join(dist, 'spa.html')) ? readFileSync(join(dist, 'spa.html'), 'utf8') : readFileSync(shellPath, 'utf8');
// Client-only routes (bag, checkout, account, admin…) are never worth indexing.
writeFileSync(join(dist, 'spa.html'), shell.replace(/<meta name="robots"[^>]*>\s*/g, '').replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <meta name="robots" content="noindex" />'));

// ---- 5. CSP hashes for inline scripts --------------------------------------------------------------------
const firebaseJson = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8'));
const csp = (firebaseJson.hosting?.headers || []).flatMap((h) => h.headers || []).find((h) => h.key === 'Content-Security-Policy')?.value || '';
const inline = [...shell.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const missing = inline.map((js) => `'sha256-${createHash('sha256').update(js).digest('base64')}'`).filter((h) => !csp.includes(h));
if (csp && missing.length) {
  console.error(`prerender: firebase.json CSP script-src is missing ${missing.join(' ')} for an inline <script> in index.html. Add it (or move the script to a file).`);
  process.exit(1);
}

// ---- static server: real files for assets, the SPA shell for every page ----------------------------------
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(dist, p);
  if (extname(p) && file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(file));
    return;
  }
  if (extname(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(shell);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { window.__KF_PRERENDER__ = true; try { localStorage.clear(); } catch { /* ignore */ } });
// Only the app itself: no Firestore, analytics, fonts or photos, so the snapshot is deterministic and fast.
await ctx.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));

const HEAD_SELECTORS = ['meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]', 'script[type="application/ld+json"][id]', 'link[rel="preload"][as="image"]'];
// Tags the snapshot replaces in the shell (the shell's own defaults are removed so nothing is duplicated).
const STRIP = [/<title>[\s\S]*?<\/title>\s*/, /<meta name="description"[^>]*>\s*/g, /<meta name="robots"[^>]*>\s*/g, /<link rel="canonical"[^>]*>\s*/g, /<meta property="og:[^>]*>\s*/g, /<meta name="twitter:[^>]*>\s*/g];

async function snapshot(path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + path, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => { const r = document.getElementById('root'); return !!r && r.children.length > 0 && !r.querySelector('[aria-busy="true"]'); }, null, { timeout: 15000 });
  await page.waitForTimeout(150); // let effects (useSeo, useJsonLd, preload) flush
  const data = await page.evaluate((sels) => ({
    html: document.getElementById('root').innerHTML,
    title: document.title,
    head: sels.flatMap((s) => [...document.head.querySelectorAll(s)]).map((el) => el.outerHTML),
  }), HEAD_SELECTORS);
  await page.close();
  if (errors.length) throw new Error(`${path}: ${errors.join('; ')}`);
  return data;
}

function render(snap) {
  let html = shell;
  for (const re of STRIP) html = html.replace(re, '');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const head = [`<title>${esc(snap.title)}</title>`, ...new Set(snap.head)].join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('shell has no empty <div id="root"></div>');
  return html.replace('<div id="root"></div>', () => `<div id="root">${snap.html}</div>`);
}

const write = (rel, html) => { const out = join(dist, rel); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html); };

const routes = publicRoutes();
let n = 0;
try {
  for (const r of routes) {
    const snap = await snapshot(r.path);
    if (!snap.html.includes('<h1')) throw new Error(`${r.path}: rendered without an <h1> (did the page 404?)`);
    write(r.path === '/' ? 'index.html' : join(r.path.slice(1), 'index.html'), render(snap));
    n++;
  }
  // Any path no route matches renders the NotFound page (noindex).
  write('404.html', render(await snapshot('/__kf-not-found__')));
} finally {
  await browser.close();
  server.close();
}
console.log(`prerender: ${n} routes + 404.html → ${dist}`);
