import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import DEFAULTS from '../../data/imagePrompts.json';
import { loadImagePrompts, saveImagePrompts, type ImagePrompts, type ImagePromptShot } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import AdminNewsletter from './AdminNewsletter';

const defaults = DEFAULTS as ImagePrompts;

const tab = ({ isActive }: { isActive: boolean }) => `rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-pine text-pine-ink' : 'hover:bg-surface-2'}`;

export default function AdminMarketing() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl">Marketing</h1>
        <div className="flex-1" />
        <nav className="flex gap-1">
          <NavLink to="/admin/marketing" end className={tab}>Image prompts</NavLink>
          <NavLink to="/admin/marketing/email" className={tab}>Email &amp; contacts</NavLink>
        </nav>
      </div>
      <Routes>
        <Route index element={<ImagePromptsEditor />} />
        <Route path="email" element={<AdminNewsletter />} />
      </Routes>
    </div>
  );
}

function ImagePromptsEditor() {
  const toast = useToast();
  const [data, setData] = useState<ImagePrompts>(defaults);
  const [saved, setSaved] = useState<string>(JSON.stringify(defaults));
  const [source, setSource] = useState<'defaults' | 'firestore'>('defaults');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadImagePrompts().then((p) => { if (p) { const merged = mergeWithDefaults(p); setData(merged); setSaved(JSON.stringify(merged)); setSource('firestore'); } }).catch(() => {});
  }, []);

  const dirty = JSON.stringify(data) !== saved;
  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const out = new Map<string, Map<string, ImagePromptShot[]>>();
    for (const s of data.shots) {
      if (q && !(s.productName + ' ' + s.filename + ' ' + s.prompt).toLowerCase().includes(q)) continue;
      if (!out.has(s.group)) out.set(s.group, new Map());
      const g = out.get(s.group)!;
      if (!g.has(s.productName)) g.set(s.productName, []);
      g.get(s.productName)!.push(s);
    }
    return out;
  }, [data.shots, filter]);

  const update = (filename: string, prompt: string) => setData((d) => ({ ...d, shots: d.shots.map((s) => (s.filename === filename ? { ...s, prompt } : s)) }));
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Copy failed; select the text and copy it by hand'); } };
  const save = async () => {
    setBusy(true);
    try { await saveImagePrompts(data); setSaved(JSON.stringify(data)); setSource('firestore'); toast('Prompts saved'); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const reset = () => { if (!confirm('Replace all prompts with the built-in defaults? Unsaved edits are lost; nothing is written until you save.')) return; setData(defaults); };
  const resetOne = (filename: string) => { const d = defaults.shots.find((s) => s.filename === filename); if (d) update(filename, d.prompt); };
  const download = () => {
    const md = toMarkdown(data);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'kindflames-image-prompts.md'; a.click();
  };
  const toggleProduct = (name: string, shots: ImagePromptShot[]) => setOpen((o) => { const all = shots.every((s) => o[s.filename]); const next = { ...o }; shots.forEach((s) => { next[s.filename] = !all; }); return next; });

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg">Product image prompts for Gemini</h2>
            <p className="mt-1 text-sm text-muted">{data.shots.length} shots across {new Set(data.shots.map((s) => s.productId)).size} products. {source === 'firestore' ? 'Showing your saved edits.' : 'Showing the built-in defaults; save once to keep your edits.'}{dirty ? ' Unsaved changes.' : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={download}>Download as Markdown</Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>Reset all to defaults</Button>
            <Button size="sm" variant="accent" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">How to use these</summary>
          <div className="prose mt-2 whitespace-pre-wrap text-muted">{data.howTo}</div>
          <p className="mt-2"><a className="text-pine underline" href="/img/logo-lockup.png" download>Download the logo to attach</a> (logo-lockup.png)</p>
        </details>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Brand style block</h3>
          <span className="text-xs text-muted">Paste this first in every chat, with the logo attached.</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => setData((d) => ({ ...d, brand: defaults.brand }))}>Reset</Button>
          <Button size="sm" onClick={() => copy(data.brand, 'Brand block')}>Copy</Button>
        </div>
        <textarea className="input mt-3 min-h-[16rem] font-mono text-xs leading-relaxed" value={data.brand} onChange={(e) => setData((d) => ({ ...d, brand: e.target.value }))} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-sm" placeholder="Filter by product, filename or words in the prompt" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="text-xs text-muted">Click a product name to expand or collapse its shots.</span>
      </div>

      {[...groups.entries()].map(([group, products]) => (
        <section key={group} className="space-y-3">
          <h3 className="eyebrow">{group}</h3>
          {[...products.entries()].map(([name, shots]) => {
            const expanded = shots.some((s) => open[s.filename]);
            return (
              <div key={name} className="card">
                <button type="button" className="flex w-full items-center gap-3 p-3 text-left sm:p-4" onClick={() => toggleProduct(name, shots)}>
                  <span className="font-display text-base font-semibold">{name}</span>
                  <span className="text-xs text-muted">{shots.length} shot{shots.length === 1 ? '' : 's'}</span>
                  <span className="flex-1" />
                  <Link to={`/admin/products/${shots[0].productId}`} className="text-xs text-muted hover:text-ink" onClick={(e) => e.stopPropagation()}>Product →</Link>
                  <span className="text-muted">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && (
                  <div className="divide-y divide-line border-t border-line">
                    {shots.map((s) => {
                      const changed = defaults.shots.find((d) => d.filename === s.filename)?.prompt !== s.prompt;
                      return (
                        <div key={s.filename} className="space-y-2 p-3 sm:p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded bg-surface-2 px-2 py-0.5 text-xs">{s.filename}</code>
                            <span className="text-xs text-muted">{s.shot}</span>
                            {changed && <span className="text-xs text-honey-dark">edited</span>}
                            <div className="flex-1" />
                            {changed && <Button size="sm" variant="ghost" onClick={() => resetOne(s.filename)}>Reset</Button>}
                            <Button size="sm" variant="ghost" onClick={() => copy(s.filename, 'Filename')}>Copy filename</Button>
                            <Button size="sm" onClick={() => copy(s.prompt, 'Prompt')}>Copy prompt</Button>
                          </div>
                          <textarea className="input min-h-[7rem] text-sm leading-relaxed" value={s.prompt} onChange={(e) => update(s.filename, e.target.value)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {groups.size === 0 && <p className="text-sm text-muted">Nothing matches that filter.</p>}

      {dirty && (
        <div className="sticky bottom-3 z-10 flex justify-end">
          <Button variant="accent" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
        </div>
      )}
    </div>
  );
}

/** Keeps saved edits but picks up any shots added to the defaults in a later release. */
function mergeWithDefaults(saved: ImagePrompts): ImagePrompts {
  const byFile = new Map(saved.shots.map((s) => [s.filename, s]));
  return {
    version: defaults.version,
    howTo: saved.howTo || defaults.howTo,
    brand: saved.brand || defaults.brand,
    shots: defaults.shots.map((d) => byFile.get(d.filename) ? { ...d, prompt: byFile.get(d.filename)!.prompt } : d),
  };
}

function toMarkdown(p: ImagePrompts) {
  const out = ['# Kind Flames — image generation prompts', '', '## How to use', '', p.howTo, '', '## Brand style block', '', '```', p.brand, '```', ''];
  let group = '', product = '';
  for (const s of p.shots) {
    if (s.group !== group) { group = s.group; out.push(`## ${group}`, ''); product = ''; }
    if (s.productName !== product) { product = s.productName; out.push(`### ${product}`, ''); }
    out.push(`**\`${s.filename}\`**`, '', '```', s.prompt, '```', '');
  }
  return out.join('\n');
}
