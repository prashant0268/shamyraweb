import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Flyer from './pages/internal/prints/Flyer';
import Flyer2 from './pages/internal/prints/Flyer2';
import FontPreview from './pages/internal/FontPreview';

function AppContent() {
  const location = useLocation();
  const isInternalRoute = location.pathname.startsWith('/internal');

  if (isInternalRoute) {
    return (
      <Routes>
        <Route path="/internal/prints/flyer" element={<Flyer />} />
        <Route path="/internal/prints/flyer2" element={<Flyer2 />} />
        <Route path="/internal/font-preview" element={<FontPreview />} />
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
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        <Router>
          <AppContent />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
