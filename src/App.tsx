import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthAction from './pages/AuthAction';
import Flyer from './pages/internal/prints/Flyer';

function AppContent() {
  const location = useLocation();
  const isInternalRoute = location.pathname.startsWith('/internal');

  if (isInternalRoute) {
    return (
      <Routes>
        <Route path="/internal/prints/flyer" element={<Flyer />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/action" element={<AuthAction />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <PayPalScriptProvider options={{
          clientId: import.meta.env.PROD
            ? import.meta.env.VITE_PAYPAL_CLIENT_ID_LIVE
            : import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: 'USD',
          intent: 'capture'
        }}>
          <Router>
            <AppContent />
          </Router>
        </PayPalScriptProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
