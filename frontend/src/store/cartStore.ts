import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  categoryId: string;
  category?: { id: string; name: string };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderType = 'DINE_IN' | 'TAKE_AWAY';
export type PaymentMethod = 'CASH' | 'QRIS';

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  subtotal: number;
  tax: number;
  total: number;
  ppnRate: number; // dynamically loaded
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomerName: (name: string) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  setPpnRate: (rate: number) => void;
  clearCart: () => void;
}
 

export const useCartStore = create<CartState>((set) => ({
  items: [],
  orderType: 'DINE_IN',
  paymentMethod: 'CASH',
  customerName: '',
  tableNumber: '',
  subtotal: 0,
  tax: 0,
  total: 0,
  ppnRate: 0.11, // Default, will be updated via settings API

  setOrderType: (type) => set({ orderType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setCustomerName: (name) => set({ customerName: name }),
  setTableNumber: (table) => set({ tableNumber: table }),
  setPpnRate: (rate) => set((state) => {
     const tax = state.subtotal * rate;
     return { ppnRate: rate, tax, total: state.subtotal + tax };
  }),

  addItem: (product) => set((state) => {
    const existingItem = state.items.find(i => i.product.id === product.id);
    const newItems = existingItem
      ? state.items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...state.items, { product, quantity: 1 }];
    
    return calculateTotals(newItems, state.ppnRate);
  }),

  removeItem: (productId) => set((state) => {
    const newItems = state.items.filter(i => i.product.id !== productId);
    return calculateTotals(newItems, state.ppnRate);
  }),

  updateQuantity: (productId, quantity) => set((state) => {
    if (quantity <= 0) {
      const newItems = state.items.filter(i => i.product.id !== productId);
      return calculateTotals(newItems, state.ppnRate);
    }
    
    const newItems = state.items.map(i => 
      i.product.id === productId ? { ...i, quantity } : i
    );
    return calculateTotals(newItems, state.ppnRate);
  }),

  clearCart: () => set({ items: [], subtotal: 0, tax: 0, total: 0, customerName: '', tableNumber: '', orderType: 'DINE_IN', paymentMethod: 'CASH' })
}));

const calculateTotals = (items: CartItem[], ppnRate: number) => {
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * ppnRate;
  const total = subtotal + tax;
  return { items, subtotal, tax, total };
};
