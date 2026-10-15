import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'accent' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; block?: boolean; to?: string; href?: string; children: ReactNode }

const base = 'inline-flex items-center justify-center gap-2 rounded-full font-bold transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100';
const variants: Record<Variant, string> = {
  primary: 'bg-pine text-pine-ink', accent: 'bg-honey text-honey-ink', ghost: 'border border-line bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-bad text-white', link: 'bg-transparent text-pine underline-offset-4 hover:underline px-0',
};
const sizes: Record<Size, string> = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5', lg: 'px-7 py-3 text-lg' };

export default function Button({ variant = 'primary', size = 'md', block, to, href, className = '', children, ...rest }: Props) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
  if (to && !rest.disabled) return <Link to={to} className={cls} onClick={rest.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}>{children}</Link>;
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer">{children}</a>;
  return <button className={cls} {...rest}>{children}</button>;
}
