import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import AuthAction from './pages/AuthAction';
import InfoPage from './pages/InfoPage';
import BuildASet from './pages/BuildASet';
import Gifts from './pages/Gifts';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { Checkout, OrderConfirmation, Account, Login, Register, Corporate, Subscribe, SubscribeThanks, OrderStatus } from './lazyRoutes';

const AdminApp = lazy(() => import('./pages/admin/AdminApp'));
const Flyer = lazy(() => import('./pages/internal/prints/Flyer'));
const Flyer2 = lazy(() => import('./pages/internal/prints/Flyer2'));
const FontPreview = lazy(() => import('./pages/internal/FontPreview'));
const GiftInsert = lazy(() => import('./pages/internal/prints/GiftInsert'));

const Loading = () => <div className="wrap min-h-[70vh] py-24 text-center text-muted" aria-busy="true">Loading…</div>;

function AppRoutes() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/internal')) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/internal/prints/flyer" element={<Flyer />} />
          <Route path="/internal/prints/flyer2" element={<Flyer2 />} />
          <Route path="/internal/font-preview" element={<FontPreview />} />
          <Route path="/internal/prints/insert" element={<GiftInsert />} />
        </Routes>
      </Suspense>
    );
  }
  if (pathname.startsWith('/admin')) {
    return <Suspense fallback={<Loading />}><AdminApp /></Suspense>;
  }
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:category" element={<Shop />} />
        <Route path="/products" element={<Navigate to="/shop" replace />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/build-a-set" element={<BuildASet />} />
        <Route path="/corporate" element={<Corporate />} />
        <Route path="/gifts" element={<Gifts />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/subscribe/thanks" element={<SubscribeThanks />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/order-status" element={<OrderStatus />} />
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Navigate to="/account" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/action" element={<AuthAction />} />
        <Route path="/:slug" element={<InfoPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <ToastProvider>
              <ThemeProvider>
                <AppRoutes />
              </ThemeProvider>
            </ToastProvider>
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
