import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { inStock, minPrice } from '../lib/catalog';
import { money } from '../lib/format';
import { useSeo } from '../lib/seo';
import Button from '../components/ui/Button';
import { ProductImage } from '../components/ui/Bits';
import { BODY_CATEGORIES, type Product, type Variant } from '../types';

type Slot = 'candle' | 'a' | 'b';
const SLOTS: { key: Slot; label: string; kind: 'candle' | 'body' }[] = [{ key: 'candle', label: 'Pick a candle', kind: 'candle' }, { key: 'a', label: 'Bath item #1', kind: 'body' }, { key: 'b', label: 'Bath item #2', kind: 'body' }];

export default function BuildASet() {
  useSeo({ title: 'Build a spa set', description: 'Pick one candle and two bath & body items, save 15%, add a gift note.', path: '/build-a-set' });
  const { products, settings } = useCatalog();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Record<Slot, Product | null>>({ candle: null, a: null, b: null });
  const [open, setOpen] = useState<Slot>('candle');
  const pct = settings.bundleDiscountPercent;
  const chosen = useMemo(() => Object.values(picks).filter(Boolean) as Product[], [picks]);
  const full = chosen.length === 3;
  const sub = chosen.reduce((t, p) => t + defaultVariant(p).price, 0);
  const disc = full ? sub * (pct / 100) : 0;

  function defaultVariant(p: Product): Variant { return (p.variants.find((v) => typeof v.stock !== 'number' || v.stock > 0) || p.variants[0]) as Variant; }
  const options = (kind: 'candle' | 'body') => products.filter((p) => (kind === 'candle' ? p.category === 'candle' : BODY_CATEGORIES.includes(p.category)) && inStock(p));
  const pick = (slot: Slot, p: Product) => { setPicks({ ...picks, [slot]: p }); const nextEmpty = SLOTS.find((s) => s.key !== slot && !picks[s.key]); if (nextEmpty) setOpen(nextEmpty.key); };
  const addSet = () => {
    const bundle = `set-${Date.now().toString(36)}`;
    for (const p of chosen) add(p.id, defaultVariant(p).id, 1, bundle);
    toast(`Spa set added — ${pct}% off applied at checkout`);
    navigate('/cart');
  };

  return (
    <div className="wrap py-8">
      <div className="mb-6"><div className="eyebrow">Build a spa set</div><h1 className="text-3xl sm:text-4xl">One candle, two bath items, {pct}% off.</h1><p className="mt-1 text-muted">Mix any scent families, or keep to one for a matched evening.</p></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {SLOTS.map((s) => { const p = picks[s.key]; return (
            <section key={s.key}>
              <h2 className="mb-2 text-xl">{s.label}</h2>
              <div className={`flex min-h-20 items-center gap-3 rounded-card border-2 p-3 ${p ? 'border-pine bg-surface' : 'border-dashed border-line bg-surface'}`}>
                {p ? <><div className="h-14 w-14 flex-none overflow-hidden rounded-card bg-surface-2"><ProductImage product={p} size={400} className="h-full w-full" /></div><div className="min-w-0 flex-1"><div className="font-bold">{p.name}</div><div className="text-xs text-muted">{defaultVariant(p).label} · {money(defaultVariant(p).price)}</div></div><Button size="sm" variant="ghost" onClick={() => { setPicks({ ...picks, [s.key]: null }); setOpen(s.key); }}>Change</Button></> : <button className="flex-1 text-left text-muted" onClick={() => setOpen(s.key)}>Choose below ↓</button>}
              </div>
              {open === s.key && !p && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">{options(s.kind).map((o) => { const used = chosen.some((c) => c.id === o.id); return (
                  <button key={o.id} disabled={used} onClick={() => pick(s.key, o)} className="card flex flex-col items-center gap-1 p-2 text-center text-xs transition hover:border-honey disabled:opacity-40"><div className="h-20 w-20 overflow-hidden rounded-md bg-surface-2"><ProductImage product={o} size={400} className="h-full w-full" /></div><span className="font-semibold leading-tight">{o.name}</span><span className="num text-muted">{money(minPrice(o))}</span></button>
                ); })}</div>
              )}
            </section>
          ); })}
        </div>
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Your set</h2>
          {chosen.length === 0 ? <p className="text-sm text-muted">Nothing picked yet.</p> : chosen.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>{p.name}</span><span className="num">{money(defaultVariant(p).price)}</span></div>)}
          {full ? <div className="flex justify-between text-sm text-good"><span>Bundle discount {pct}%</span><span className="num">−{money(disc)}</span></div> : <p className="text-xs text-muted">{3 - chosen.length} more pick{3 - chosen.length === 1 ? '' : 's'} to unlock {pct}% off</p>}
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><span>Total</span><span className="num">{money(sub - disc)}</span></div>
          <Button block variant="accent" disabled={!full} onClick={addSet}>Add set to bag</Button>
          <p className="text-xs text-muted">Gift box and message can be added at checkout.</p>
        </aside>
      </div>
    </div>
  );
}
