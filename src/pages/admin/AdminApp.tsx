import { NavLink, Route, Routes, Link } from 'react-router-dom';
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
import AdminNewsletter from './AdminNewsletter';

const NAV: [string, string][] = [['/admin', 'Overview'], ['/admin/orders', 'Orders'], ['/admin/products', 'Products'], ['/admin/quotes', 'Corporate quotes'], ['/admin/discounts', 'Discounts'], ['/admin/reviews', 'Reviews'], ['/admin/newsletter', 'Newsletter'], ['/admin/settings', 'Settings']];

export default function AdminApp() {
  useSeo({ title: 'Admin', noindex: true });
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="wrap py-24 text-center text-muted">Loading…</div>;
  if (!user || user.isAnonymous) return <div className="wrap max-w-md py-24 text-center"><h1 className="text-2xl">Admin</h1><p className="mt-2 text-muted">Sign in with the owner account to continue.</p><Button to="/login?next=/admin" className="mt-4">Sign in</Button></div>;
  if (!user.isAdmin) return <div className="wrap max-w-md py-24 text-center"><h1 className="text-2xl">Not an admin</h1><p className="mt-2 text-sm text-muted">{user.email} isn't on the admin list. Add it to <code>ADMIN_EMAILS</code> in <code>functions/.env</code> and redeploy functions, then sign out and back in.</p><div className="mt-4 flex justify-center gap-2"><Button variant="ghost" onClick={() => logout()}>Sign out</Button><Button to="/">Back to store</Button></div></div>;
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-surface"><div className="wrap flex h-14 items-center gap-4"><Link to="/admin" className="font-display text-lg font-bold">Kind Flames · Admin</Link><nav className="flex gap-1 overflow-x-auto text-sm">{NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 font-semibold ${isActive ? 'bg-pine text-pine-ink' : 'hover:bg-surface-2'}`}>{l}</NavLink>)}</nav><div className="flex-1" /><Link to="/" className="text-sm text-muted hover:text-ink">View store →</Link></div></header>
      <div className="wrap py-6">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProducts />} />
          <Route path="quotes" element={<AdminQuotes />} />
          <Route path="discounts" element={<AdminDiscounts />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="newsletter" element={<AdminNewsletter />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
}
