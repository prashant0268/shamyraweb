import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/shop/candle', label: 'Candles' },
  { to: '/shop/body', label: 'Bath & Body' },
  { to: '/shop/set', label: 'Gift Sets' },
  { to: '/build-a-set', label: 'Build a Set' },
  { to: '/corporate', label: 'Corporate' },
];

export default function Navbar() {
  const { count, open } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);

  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) { navigate(`/shop?q=${encodeURIComponent(q.trim())}`); setMenu(false); } };
  const link = 'border-b-2 border-transparent py-1 font-medium text-ink hover:text-pine';
  const active = ({ isActive }: { isActive: boolean }) => `${link} ${isActive ? 'border-honey' : ''}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="wrap flex h-16 items-center gap-4">
        <button className="rounded-lg p-2 hover:bg-surface-2 md:hidden" aria-label="Menu" onClick={() => setMenu(true)}><Menu size={22} /></button>
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <img src="/img/logo-512.png" alt="" width="36" height="36" className="h-9 w-9 object-contain" />
          <span>Kind Flames</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-6 md:flex">{LINKS.map((l) => <NavLink key={l.to} to={l.to} className={active}>{l.label}</NavLink>)}</nav>
        <div className="flex-1" />
        <form onSubmit={search} className="hidden items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 lg:flex">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lavender, scrub…" aria-label="Search" className="w-40 bg-transparent text-sm outline-none" />
        </form>
        <Link to={user && !user.isAnonymous ? '/account' : '/login'} aria-label="Account" className="rounded-lg p-2 hover:bg-surface-2"><User size={22} /></Link>
        <button onClick={open} aria-label={`Bag, ${count} items`} className="relative rounded-lg p-2 hover:bg-surface-2">
          <ShoppingBag size={22} />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-honey px-1 text-xs font-bold text-honey-ink">{count}</span>}
        </button>
      </div>

      {menu && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="flex h-full w-[min(320px,85vw)] flex-col gap-1 overflow-auto bg-surface p-5">
            <div className="mb-2 flex items-center justify-between"><span className="font-display text-xl font-bold">Menu</span><button onClick={() => setMenu(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-surface-2"><X size={22} /></button></div>
            <form onSubmit={search} className="mb-3 flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2"><Search size={16} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search" className="w-full bg-transparent text-sm outline-none" /></form>
            {[{ to: '/shop', label: 'Shop all' }, { to: '/shop/candle', label: 'Candles' }, { to: '/shop/scrub', label: 'Body Scrubs' }, { to: '/shop/lotion', label: 'Lotions' }, { to: '/shop/salt', label: 'Bath Salts' }, { to: '/shop/set', label: 'Gift Sets' }, { to: '/build-a-set', label: 'Build a Spa Set' }, { to: '/corporate', label: 'Corporate Gifting' }, { to: user && !user.isAnonymous ? '/account' : '/login', label: user && !user.isAnonymous ? 'My account' : 'Sign in' }, ...(user?.isAdmin ? [{ to: '/admin', label: 'Admin' }] : [])].map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenu(false)} className="border-b border-line py-3 font-display text-lg">{l.label}</Link>
            ))}
          </div>
          <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMenu(false)} />
        </div>
      )}
    </header>
  );
}
