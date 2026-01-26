import { create } from 'zustand';
import { apiFetch } from './api';

interface User {
  id: number;
  nickname: string;
  profileImg: string | null;
  bojId: string | null;
  league: string;
  leaguePoint: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetch<User>('/api/users/me');
      if (response.success && response.data) {
        set({ isAuthenticated: true, user: response.data, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },

  logout: async () => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    set({ isAuthenticated: false, user: null });
    window.location.href = '/login';
  },

  setUser: (user: User) => {
    set({ isAuthenticated: true, user });
  },
}));
