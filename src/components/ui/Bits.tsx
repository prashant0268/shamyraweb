import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Flame, Leaf, Package, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { srcSet, imgAt } from '../../lib/images';
import { placeholderImages } from '../../data/imagery';
import { useCatalog } from '../../context/CatalogContext';
import type { Product } from '../../types';

export const Stars = ({ rating, count, size = 'sm' }: { rating?: number | null; count?: number; size?: 'sm' | 'md' }) => {
  if (!rating) return null;
  const r = Math.round(rating);
  return <span className={`${size === 'md' ? 'text-base' : 'text-sm'} tracking-wider text-honey`} aria-label={`${rating} out of 5`}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}{count ? <span className="ml-1 text-muted tracking-normal">({count})</span> : null}</span>;
};

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent' | 'pine';
const tones: Record<Tone, string> = { neutral: 'bg-surface-2 text-ink', good: 'bg-good/15 text-good', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad', accent: 'bg-honey/25 text-ink', pine: 'bg-pine text-pine-ink' };
export const Badge = ({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>
);

export const SectionHead = ({ eyebrow, title, action, center, sub }: { eyebrow?: string; title: ReactNode; action?: ReactNode; center?: boolean; sub?: ReactNode }) => (
  <div className={`mb-6 flex flex-wrap items-end justify-between gap-3 ${center ? 'justify-center text-center' : ''}`}>
    <div className={center ? 'mx-auto' : ''}>{eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}<h2 className="text-2xl sm:text-3xl lg:text-4xl">{title}</h2>{sub && <p className="mt-2 max-w-[56ch] text-muted">{sub}</p>}</div>
    {action}
  </div>
);

export const Field = ({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) => (
  <div className={`min-w-0 ${className}`}><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
);

export const Alert = ({ children, tone = 'bad' }: { children: ReactNode; tone?: 'bad' | 'good' | 'warn' }) => (
  <div role="alert" className={`rounded-card border px-4 py-3 text-sm ${tone === 'bad' ? 'border-bad/30 bg-bad/10 text-bad' : tone === 'good' ? 'border-good/30 bg-good/10 text-good' : 'border-warn/30 bg-warn/10 text-warn'}`}>{children}</div>
);

/** All images for a product, honouring the placeholder-photo mode (Admin → Appearance). */
export function useProductImages(product: Product): string[] {
  const { settings } = useCatalog();
  if (settings.placeholderImages !== false) return placeholderImages(product.id);
  return product.images?.length ? product.images : [];
}

export const ProductImage = ({ product, size = 800, className = '', eager, index = 0, hover }: { product: Product; size?: 400 | 800; className?: string; eager?: boolean; index?: number; hover?: boolean }) => {
  const imgs = useProductImages(product);
  const src = imgs[index] ?? imgs[0];
  if (!src) return <div className={`flex items-center justify-center bg-surface-2 text-muted ${className}`}>No photo</div>;
  const second = hover ? imgs[1] : undefined;
  const local = src.startsWith('/');
  const img = (s: string, extra = '') => <img src={local ? imgAt(s, size) : s} srcSet={local ? srcSet(s) : undefined} sizes={size === 400 ? '(max-width: 640px) 50vw, 25vw' : '(max-width: 860px) 100vw, 50vw'} alt={product.name} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`object-cover ${className} ${extra}`} />;
  if (!second || second === src) return img(src);
  return (
    <span className="group/img relative block h-full w-full">
      {img(src, 'transition-opacity duration-500 group-hover/img:opacity-0')}
      <img src={second} alt="" aria-hidden="true" loading="lazy" decoding="async" className={`absolute inset-0 object-cover opacity-0 transition-opacity duration-500 group-hover/img:opacity-100 ${className}`} />
    </span>
  );
};

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => <div className="py-16 text-center text-muted">{label}</div>;

export const Qty = ({ value, onChange, size = 'md' }: { value: number; onChange: (n: number) => void; size?: 'sm' | 'md' }) => {
  const b = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex overflow-hidden rounded-btn border border-line bg-surface">
      <button type="button" aria-label="Decrease" className={`${b} hover:bg-surface-2`} onClick={() => onChange(value - 1)}>−</button>
      <span className={`${b} num flex items-center justify-center font-bold`}>{value}</span>
      <button type="button" aria-label="Increase" className={`${b} hover:bg-surface-2`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
};

/** Horizontal scroll-snap rail with arrow buttons (bestsellers, scenes, related products). */
export function Rail({ children, label, itemClass = 'w-[min(72vw,280px)]' }: { children: ReactNode; label: string; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => { const el = ref.current; if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' }); };
  return (
    <div className="relative">
      <div ref={ref} className="rail -mx-4 px-4 sm:-mx-6 sm:px-6 xl:-mx-10 xl:px-10" aria-label={label} style={{ ['--rail-item' as string]: itemClass }}>
        {Array.isArray(children) ? children.map((c, i) => <div key={i} className={itemClass}>{c}</div>) : <div className={itemClass}>{children}</div>}
      </div>
      <div className="pointer-events-none absolute inset-y-0 -left-2 -right-2 hidden items-center justify-between lg:flex">
        <button type="button" aria-label="Scroll left" onClick={() => go(-1)} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-btn border border-line bg-surface shadow-card hover:bg-surface-2"><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Scroll right" onClick={() => go(1)} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-btn border border-line bg-surface shadow-card hover:bg-surface-2"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

const VALUE_ICONS = { flame: Flame, leaf: Leaf, package: Package, shield: ShieldCheck, refresh: RefreshCw, sparkles: Sparkles };
export type ValueItem = { icon: keyof typeof VALUE_ICONS; title: string; sub?: string };
/** Icon value-prop strip (hand-poured, clean, ships fast…). Compact variant for product pages. */
export const ValueStrip = ({ items, compact }: { items: ValueItem[]; compact?: boolean }) => (
  <div className={compact ? 'grid grid-cols-3 gap-3 sm:grid-cols-6' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4'}>
    {items.map((v) => { const Icon = VALUE_ICONS[v.icon]; return (
      <div key={v.title} className={compact ? 'flex flex-col items-center gap-1.5 text-center' : 'flex gap-3'}>
        <span className={`flex shrink-0 items-center justify-center rounded-btn bg-surface-2 text-pine ${compact ? 'h-10 w-10' : 'h-11 w-11'}`}><Icon size={compact ? 18 : 20} /></span>
        <div><div className={compact ? 'text-xs font-bold leading-tight' : 'font-bold'}>{v.title}</div>{v.sub && !compact && <div className="text-sm text-muted">{v.sub}</div>}</div>
      </div>
    ); })}
  </div>
);
