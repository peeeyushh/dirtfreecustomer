import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
  cartId: string;
  serviceId: string;
  name: string;
  price: string;
  date: string;
  startTime: string;
  type: string;
  durationLabel?: string;
  frequency?: string;
  endDate?: string;
  occurrences?: number;
  isUrgent?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartId'>) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, 'cartId'>) => {
    const newCartItem = {
      ...item,
      cartId: Math.random().toString(36).substr(2, 9),
    };
    setItems((prev) => [...prev, newCartItem]);
  };

  const removeFromCart = (cartId: string) => {
    setItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalPrice = items.reduce((sum, item) => {
    const base = parseFloat(item.price || '0') * (item.occurrences || 1);
    return sum + base;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
