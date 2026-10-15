import type { ReactNode } from 'react';
import { srcSet, imgAt } from '../../lib/images';
import type { Product } from '../../types';

export const Stars = ({ rating, count }: { rating?: number | null; count?: number }) => {
  if (!rating) return null;
  const r = Math.round(rating);
  return <span className="text-sm text-honey tracking-wider" aria-label={`${rating} out of 5`}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}{count ? <span className="ml-1 text-muted tracking-normal">({count})</span> : null}</span>;
};

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent' | 'pine';
const tones: Record<Tone, string> = { neutral: 'bg-surface-2 text-ink', good: 'bg-good/15 text-good', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad', accent: 'bg-honey/25 text-ink', pine: 'bg-pine text-pine-ink' };
export const Badge = ({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>
);

export const SectionHead = ({ eyebrow, title, action, center }: { eyebrow?: string; title: ReactNode; action?: ReactNode; center?: boolean }) => (
  <div className={`mb-6 flex flex-wrap items-end justify-between gap-3 ${center ? 'justify-center text-center' : ''}`}>
    <div>{eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}<h2 className="text-2xl sm:text-3xl">{title}</h2></div>
    {action}
  </div>
);

export const Field = ({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) => (
  <div className={`min-w-0 ${className}`}><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
);

export const Alert = ({ children, tone = 'bad' }: { children: ReactNode; tone?: 'bad' | 'good' | 'warn' }) => (
  <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${tone === 'bad' ? 'border-bad/30 bg-bad/10 text-bad' : tone === 'good' ? 'border-good/30 bg-good/10 text-good' : 'border-warn/30 bg-warn/10 text-warn'}`}>{children}</div>
);

export const ProductImage = ({ product, size = 800, className = '', eager }: { product: Product; size?: 400 | 800; className?: string; eager?: boolean }) => {
  const src = product.images?.[0];
  if (!src) return <div className={`flex items-center justify-center bg-surface-2 text-muted ${className}`}>No photo</div>;
  return <img src={imgAt(src, size)} srcSet={srcSet(src)} sizes={size === 400 ? '(max-width: 640px) 50vw, 25vw' : '(max-width: 860px) 100vw, 50vw'} alt={product.name} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`object-cover ${className}`} />;
};

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => <div className="py-16 text-center text-muted">{label}</div>;

export const Qty = ({ value, onChange, size = 'md' }: { value: number; onChange: (n: number) => void; size?: 'sm' | 'md' }) => {
  const b = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line bg-surface">
      <button type="button" aria-label="Decrease" className={`${b} hover:bg-surface-2`} onClick={() => onChange(value - 1)}>−</button>
      <span className={`${b} num flex items-center justify-center font-bold`}>{value}</span>
      <button type="button" aria-label="Increase" className={`${b} hover:bg-surface-2`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
};
