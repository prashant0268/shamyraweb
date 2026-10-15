import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Order } from '../types';

const toOrder = (d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }) as Order;

export async function getUserOrders(uid: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(toOrder);
}
export async function getOrder(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id));
  return snap.exists() ? toOrder(snap) : null;
}
export async function adminListOrders(status?: string): Promise<Order[]> {
  const base = collection(db, 'orders');
  const q = status && status !== 'all' ? query(base, where('status', '==', status), orderBy('createdAt', 'desc'), limit(200)) : query(base, orderBy('createdAt', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map(toOrder);
}
