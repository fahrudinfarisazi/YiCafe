import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'CUSTOMER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to load from local storage
  const storedToken = localStorage.getItem('pos_token');
  const storedUser = localStorage.getItem('pos_user');
  
  const initialUser = storedUser ? JSON.parse(storedUser) : null;

  return {
    user: initialUser,
    token: storedToken,
    isAuthenticated: !!storedToken,

    login: (user, token) => {
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  };
});
