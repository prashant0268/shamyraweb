import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSeo } from '../../lib/seo';
import Button from '../../components/ui/Button';
import AdminOverview from './AdminOverview';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminQuotes from './AdminQuotes';
import AdminDiscounts from './AdminDiscounts';
import AdminReviews from './AdminReviews';
import AdminSettings from './AdminSettings';
import AdminSubscriptions from './AdminSubscriptions';
import AdminMarketing from './AdminMarketing';

const NAV: { to: string; label: string; group?: string }[] = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/orders', label: 'Orders', group: 'Sell' },
  { to: '/admin/products', label: 'Products', group: 'Sell' },
  { to: '/admin/discounts', label: 'Discounts', group: 'Sell' },
  { to: '/admin/subscriptions', label: 'Subscriptions', group: 'Sell' },
  { to: '/admin/quotes', label: 'Corporate quotes', group: 'Sell' },
  { to: '/admin/marketing', label: 'Marketing', group: 'Grow' },
  { to: '/admin/reviews', label: 'Reviews', group: 'Grow' },
  { to: '/admin/settings', label: 'Settings', group: 'Store' },
];

export default function AdminApp() {
  useSeo({ title: 'Admin', noindex: true });
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);

  if (loading) return <div className="wrap py-24 text-center text-muted">Loading…</div>;
  if (!user || user.isAnonymous) return <div className="wrap max-w-md py-24 text-center"><h1 className="text-2xl">Admin</h1><p className="mt-2 text-muted">Sign in with the owner account to continue.</p><Button to="/login?next=/admin" className="mt-4">Sign in</Button></div>;
  if (!user.isAdmin) return <div className="wrap max-w-md py-24 text-center"><h1 className="text-2xl">Not an admin</h1><p className="mt-2 text-sm text-muted">{user.email} isn't on the admin list. Add it to <code>ADMIN_EMAILS</code> in <code>functions/.env</code> and redeploy functions, then sign out and back in.</p><div className="mt-4 flex justify-center gap-2"><Button variant="ghost" onClick={() => logout()}>Sign out</Button><Button to="/">Back to store</Button></div></div>;

  const groups: [string | undefined, typeof NAV][] = [];
  for (const item of NAV) { const g = groups.find(([k]) => k === item.group); if (g) g[1].push(item); else groups.push([item.group, [item]]); }

  const sidebar = (
    <nav className="flex h-full flex-col gap-5 p-4">
      <Link to="/admin" className="flex items-center gap-2 px-2 font-display text-lg font-bold"><img src="/img/logo-512.png" alt="" width="28" height="28" className="h-7 w-7" />Admin</Link>
      {groups.map(([group, items]) => (
        <div key={group ?? 'top'} className="space-y-0.5">
          {group && <div className="eyebrow px-2 pb-1">{group}</div>}
          {items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/admin'} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-pine text-pine-ink' : 'text-ink hover:bg-surface-2'}`}>{i.label}</NavLink>)}
        </div>
      ))}
      <div className="flex-1" />
      <div className="space-y-1 border-t border-line pt-3 text-sm">
        <Link to="/" className="block rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-ink">View store →</Link>
        <button type="button" onClick={() => logout()} className="block w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-surface-2 hover:text-ink">Sign out</button>
        <div className="truncate px-3 pt-1 text-xs text-muted">{user.email}</div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-line bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface shadow-xl">
            <button type="button" className="absolute right-2 top-3 rounded-lg p-2 hover:bg-surface-2" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button type="button" className="rounded-lg p-2 hover:bg-surface-2" aria-label="Menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <Link to="/admin" className="font-display text-lg font-bold">Kind Flames · Admin</Link>
          <div className="flex-1" />
          <Link to="/" className="text-sm text-muted hover:text-ink">Store →</Link>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="*" element={<AdminOverview />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/:id" element={<AdminProducts />} />
            <Route path="/admin/quotes" element={<AdminQuotes />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/discounts" element={<AdminDiscounts />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/marketing/*" element={<AdminMarketing />} />
            <Route path="/admin/newsletter" element={<Navigate to="/admin/marketing/email" replace />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
