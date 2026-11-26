// Writes public/sitemap.xml from scripts/routes.mjs. <lastmod> is the newest git commit date of the files a
// route is built from (falls back to today outside a git checkout). Runs automatically via "prebuild".
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { publicRoutes, root, SITE } from './routes.mjs';

const cache = new Map();
function lastCommit(file) {
  if (!cache.has(file)) {
    let d = '';
    try { d = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not a git checkout */ }
    cache.set(file, d ? d.slice(0, 10) : '');
  }
  return cache.get(file);
}
const today = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const urls = publicRoutes().filter((r) => r.sitemap).map((r) => {
  const lastmod = r.source.map(lastCommit).filter(Boolean).sort().pop() || today;
  return `  <url><loc>${esc(SITE + (r.path === '/' ? '/' : r.path))}</loc><lastmod>${lastmod}</lastmod></url>`;
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
const out = resolve(root, 'public/sitemap.xml');
writeFileSync(out, xml);
console.log(`sitemap: wrote ${urls.length} urls → ${out}`);
