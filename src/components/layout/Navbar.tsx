import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { IMG, FAMILY_BLURBS } from '../../data/imagery';
import { CATEGORY_LABELS, type Category } from '../../types';

type Col = { title: string; links: { to: string; label: string; note?: string }[] };
type Tile = { to: string; img: string; title: string; sub: string };
type Mega = { key: string; label: string; to: string; cols: Col[]; tiles: Tile[] };

const CATS: Category[] = ['candle', 'scrub', 'lotion', 'salt', 'set'];

export default function Navbar() {
  const { count, open } = useCart();
  const { user } = useAuth();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { setMenu(false); setMega(null); setSearchOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMega(null); setSearchOpen(false); setMenu(false); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const families = useMemo(() => [...new Set(products.filter((p) => p.family !== 'Mixed').map((p) => p.family))].sort(), [products]);
  const MEGA: Mega[] = useMemo(() => [
    {
      key: 'shop', label: 'Shop', to: '/shop',
      cols: [
        { title: 'By product', links: [...CATS.map((c) => ({ to: `/shop/${c}`, label: CATEGORY_LABELS[c] })), { to: '/shop', label: 'Shop everything' }] },
        { title: 'By scent', links: families.map((f) => ({ to: `/shop?family=${encodeURIComponent(f)}`, label: f, note: FAMILY_BLURBS[f] })) },
        { title: 'Collections', links: [{ to: '/shop?sort=featured', label: 'Best sellers' }, { to: '/shop?sort=new', label: 'New arrivals' }, { to: '/gifts', label: 'Holiday gift guide' }, { to: '/build-a-set', label: 'Build a spa set', note: 'Save 15%' }, { to: '/subscribe', label: 'Candle of the Month' }] },
      ],
      tiles: [{ to: '/shop/candle', img: IMG.catCandles, title: 'The candles', sub: 'Coconut-soy, 45–60 hour burn' }, { to: '/shop/body', img: IMG.bath, title: 'Bath & body', sub: 'Same scents, for the tub' }],
    },
    {
      key: 'gifts', label: 'Gifts', to: '/gifts',
      cols: [
        { title: 'By budget', links: [{ to: '/shop?max=25', label: 'Under $25' }, { to: '/shop?max=50', label: 'Under $50' }, { to: '/shop/set', label: 'Gift sets' }] },
        { title: 'By occasion', links: [{ to: '/gifts', label: 'Holiday gift guide' }, { to: '/build-a-set', label: 'Build a spa set' }, { to: '/subscribe', label: 'Gift a subscription' }, { to: '/corporate', label: 'Corporate & bulk gifting' }] },
      ],
      tiles: [{ to: '/gifts', img: IMG.giftOpen, title: 'Gift guide', sub: 'By person, by budget' }, { to: '/corporate', img: IMG.tissue, title: 'For teams & clients', sub: 'Logo labels from 25 units' }],
    },
  ], [families]);

  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) { navigate(`/shop?q=${encodeURIComponent(q.trim())}`); setMenu(false); setSearchOpen(false); } };
  const link = 'nav-link flex items-center gap-1 border-b-2 border-transparent py-1 text-ink hover:text-pine';
  const active = ({ isActive }: { isActive: boolean }) => `${link} ${isActive ? 'border-honey' : ''}`;
  const accountTo = user && !user.isAnonymous ? '/account' : '/login';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur" onMouseLeave={() => setMega(null)}>
      <div className="wrap flex h-16 items-center gap-2 lg:h-[72px] lg:gap-4">
        <button className="rounded-btn p-2 hover:bg-surface-2 lg:hidden" aria-label="Menu" onClick={() => setMenu(true)}><Menu size={22} /></button>
        <Link to="/" className="flex shrink-0 items-center" aria-label="Kind Flames home">
          <img src="/img/logo-lockup.png" alt="Kind Flames" width="120" height="82" className="h-10 w-auto lg:h-12" />
        </Link>
        <nav className="ml-4 hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main">
          {MEGA.map((m) => (
            <div key={m.key} onMouseEnter={() => setMega(m.key)} onFocus={() => setMega(m.key)}>
              <NavLink to={m.to} className={active} aria-expanded={mega === m.key} aria-haspopup="true">{m.label} <ChevronDown size={14} className={`transition ${mega === m.key ? 'rotate-180' : ''}`} /></NavLink>
            </div>
          ))}
          <NavLink to="/shop/candle" className={active} onMouseEnter={() => setMega(null)}>Candles</NavLink>
          <NavLink to="/shop/body" className={active} onMouseEnter={() => setMega(null)}>Bath &amp; Body</NavLink>
          <NavLink to="/build-a-set" className={active} onMouseEnter={() => setMega(null)}>Build a Set</NavLink>
          <NavLink to="/subscribe" className={active} onMouseEnter={() => setMega(null)}>Subscribe</NavLink>
        </nav>
        <div className="flex-1" />
        <form onSubmit={search} className={`hidden items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 py-1.5 transition-all lg:flex ${searchOpen ? 'w-64' : 'w-10 cursor-pointer justify-center border-transparent bg-transparent px-0'}`} onClick={() => setSearchOpen(true)}>
          <Search size={18} className="shrink-0 text-muted" />
          {searchOpen && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => { if (!q) setSearchOpen(false); }} placeholder="Search lavender, scrub, gift…" aria-label="Search" className="w-full bg-transparent text-sm outline-none" />}
        </form>
        <Link to={accountTo} aria-label="Account" className="rounded-btn p-2 hover:bg-surface-2"><User size={21} /></Link>
        <button onClick={open} aria-label={`Bag, ${count} items`} className="relative rounded-btn p-2 hover:bg-surface-2">
          <ShoppingBag size={21} />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-honey px-1 text-[11px] font-bold text-honey-ink">{count}</span>}
        </button>
      </div>

      {/* Mega menu */}
      {MEGA.filter((m) => m.key === mega).map((m) => (
        <div key={m.key} className="absolute inset-x-0 top-full hidden border-b border-line bg-surface shadow-card lg:block" onMouseEnter={() => setMega(m.key)}>
          <div className="wrap grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-8 py-8">
            {m.cols.map((c) => (
              <div key={c.title}>
                <div className="eyebrow mb-3">{c.title}</div>
                <ul className="space-y-2">{c.links.map((l) => <li key={l.to + l.label}><Link to={l.to} className="group/l block" onClick={() => setMega(null)}><span className="font-semibold group-hover/l:underline">{l.label}</span>{l.note && <span className="block text-xs text-muted">{l.note}</span>}</Link></li>)}</ul>
              </div>
            ))}
            {m.cols.length < 3 && <div />}
            <div className="flex gap-4">
              {m.tiles.map((t) => (
                <Link key={t.to} to={t.to} onClick={() => setMega(null)} className="group/t relative block h-56 w-48 overflow-hidden rounded-img bg-surface-2 xl:w-56">
                  <img src={t.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover/t:scale-105" loading="lazy" />
                  <span className="hero-overlay absolute inset-0" />
                  <span className="absolute inset-x-0 bottom-0 p-4 text-white"><span className="block font-display text-lg leading-tight">{t.title}</span><span className="block text-xs opacity-90">{t.sub}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Mobile drawer */}
      {menu && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div className="flex h-full w-[min(360px,88vw)] flex-col overflow-auto bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><img src="/img/logo-lockup.png" alt="Kind Flames" className="h-9 w-auto" /><button onClick={() => setMenu(false)} aria-label="Close" className="rounded-btn p-2 hover:bg-surface-2"><X size={22} /></button></div>
            <form onSubmit={search} className="m-5 flex items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 py-2"><Search size={16} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search" className="w-full bg-transparent text-sm outline-none" /></form>
            <nav className="px-5 pb-6" aria-label="Mobile">
              <div className="eyebrow mb-2">Shop</div>
              {[{ to: '/shop', label: 'Shop everything' }, ...CATS.map((c) => ({ to: `/shop/${c}`, label: CATEGORY_LABELS[c] }))].map((l) => <Link key={l.to} to={l.to} className="block border-b border-line py-3 font-display text-lg">{l.label}</Link>)}
              <div className="eyebrow mb-2 mt-6">By scent</div>
              <div className="flex flex-wrap gap-2">{families.map((f) => <Link key={f} to={`/shop?family=${encodeURIComponent(f)}`} className="rounded-pill border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">{f}</Link>)}</div>
              <div className="eyebrow mb-2 mt-6">More</div>
              {[{ to: '/gifts', label: 'Holiday gift guide' }, { to: '/build-a-set', label: 'Build a spa set' }, { to: '/subscribe', label: 'Candle of the Month' }, { to: '/corporate', label: 'Corporate gifting' }, { to: '/about', label: 'Our story' }, { to: accountTo, label: user && !user.isAnonymous ? 'My account' : 'Sign in' }, ...(user?.isAdmin ? [{ to: '/admin', label: 'Admin' }] : [])].map((l) => <Link key={l.to} to={l.to} className="block border-b border-line py-3 font-display text-lg">{l.label}</Link>)}
            </nav>
          </div>
          <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMenu(false)} />
        </div>
      )}
    </header>
  );
}
