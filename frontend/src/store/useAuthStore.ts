import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
  name?: string;
  phone?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'fixnow-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
