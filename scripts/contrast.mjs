// WCAG AA contrast check for the theme tokens in src/index.css (all 5 themes).
// Text pairs need 4.5:1, the focus ring 3:1 against the surfaces it sits on. Exits 1 on any failure.
// Usage: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/index.css'), 'utf8');
const vars = (block) => Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const base = vars(css.match(/@theme\s*{([\s\S]*?)}/)[1]);
const themes = { hearth: base };
for (const m of css.matchAll(/\[data-theme="(\w+)"\]\s*{([\s\S]*?)}/g)) themes[m[1]] = { ...base, ...vars(m[2]) };

const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const TEXT = [['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'], ['pine', 'bg'], ['pine', 'surface'],
  ['pine-ink', 'pine'], ['honey-ink', 'honey'], ['bg', 'ink'], ['good', 'surface'], ['good', 'bg'], ['warn', 'surface'], ['warn', 'bg'], ['bad', 'surface'], ['bad', 'bg']];
const RING = [['focus', 'bg'], ['focus', 'surface'], ['focus', 'surface-2']];
let fails = 0;
for (const [name, t] of Object.entries(themes)) {
  const out = [];
  for (const [fg, bg] of TEXT) { const r = ratio(t[fg], t[bg]); if (r < 4.5) { fails++; out.push(`  FAIL text ${fg} on ${bg}: ${r.toFixed(2)}:1 (${t[fg]} / ${t[bg]})`); } }
  for (const [fg, bg] of RING) { if (!t[fg]) { fails++; out.push(`  FAIL --color-${fg} is not defined`); continue; } const r = ratio(t[fg], t[bg]); if (r < 3) { fails++; out.push(`  FAIL ring ${fg} on ${bg}: ${r.toFixed(2)}:1`); } }
  const worst = Math.min(...TEXT.map(([fg, bg]) => ratio(t[fg], t[bg])));
  console.log(`${name.padEnd(11)} ${out.length ? 'FAIL' : 'ok  '}  lowest text pair ${worst.toFixed(2)}:1`);
  out.forEach((l) => console.log(l));
}
if (fails) { console.log(`contrast: ${fails} failure(s)`); process.exit(1); }
console.log('contrast: all themes meet WCAG AA');
