import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { saveCartToFirestore, loadCartFromFirestore } from '../utils/firestoreHelpers';
import { CartContextType, CartItem, Product } from '../types';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load cart from localStorage or Firestore on mount
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        // User is logged in - load from Firestore
        const firestoreCart = await loadCartFromFirestore(user.uid);

        // Merge with any items in localStorage (guest cart)
        const localCart = localStorage.getItem('shamyra_cart');
        if (localCart) {
          const localItems: CartItem[] = JSON.parse(localCart);
          // Merge carts, combining quantities for same products
          const mergedCart = [...firestoreCart];

          localItems.forEach(localItem => {
            const existingIndex = mergedCart.findIndex(item => item.id === localItem.id);
            if (existingIndex >= 0) {
              mergedCart[existingIndex].quantity += localItem.quantity;
            } else {
              mergedCart.push(localItem);
            }
          });

          setCartItems(mergedCart);
          // Save merged cart to Firestore and clear localStorage
          await saveCartToFirestore(user.uid, mergedCart);
          localStorage.removeItem('shamyra_cart');
        } else {
          setCartItems(firestoreCart);
        }
      } else {
        // Guest user - load from localStorage
        const savedCart = localStorage.getItem('shamyra_cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      }
      setIsLoading(false);
    };

    loadCart();
  }, [user]);

  // Save cart changes
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Save to Firestore for logged-in users
        saveCartToFirestore(user.uid, cartItems);
      } else {
        // Save to localStorage for guests
        localStorage.setItem('shamyra_cart', JSON.stringify(cartItems));
      }
    }
  }, [cartItems, user, isLoading]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);

      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevItems, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = (): number => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = (): number => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    isLoading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
