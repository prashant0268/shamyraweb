// Product types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  featured: boolean;
  inStock: boolean;
}

export interface Category {
  id: string;
  name: string;
}

// Cart types
export interface CartItem extends Product {
  quantity: number;
}

// Order types
export interface ShippingAddress {
  fullName: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
}

export interface OrderData {
  items: CartItem[];
  total: number;
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
}

// Auth types
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

// Context types
export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

export interface CartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

// Component prop types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export interface ProductCardProps {
  product: Product;
}
