import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CartItem, OrderData, Order } from '../types';

// Save cart to Firestore for logged-in users
export const saveCartToFirestore = async (userId: string, cartItems: CartItem[]): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    await setDoc(cartRef, {
      items: cartItems,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving cart to Firestore:', error);
  }
};

// Load cart from Firestore
export const loadCartFromFirestore = async (userId: string): Promise<CartItem[]> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cartDoc = await getDoc(cartRef);

    if (cartDoc.exists()) {
      return cartDoc.data().items || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading cart from Firestore:', error);
    return [];
  }
};

// Create a new order
export const createOrder = async (userId: string, orderData: OrderData): Promise<Order> => {
  try {
    const ordersRef = collection(db, 'orders');
    const order = {
      userId,
      items: orderData.items,
      total: orderData.total,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      shippingAddress: orderData.shippingAddress || null,
      paymentMethod: orderData.paymentMethod || null
    };

    const docRef = await addDoc(ordersRef, order);
    return {
      id: docRef.id,
      ...order,
      createdAt: Timestamp.now() as any // Firestore timestamp
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get user orders
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });

    return orders.sort((a, b) => {
      // Sort by createdAt descending (newest first)
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.seconds - a.createdAt.seconds;
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    return [];
  }
};

// Save user profile data
export const saveUserProfile = async (userId: string, profileData: any): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
