import { create } from 'zustand';
import { apiFetch, setAuthToken } from '@/lib/api';

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
  accessToken: string | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User, accessToken?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  isLoading: true,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetch<User & { accessToken?: string }>('/api/users/me');
      if (response.success && response.data) {
        const token = response.data.accessToken || null;
        setAuthToken(token);
        set({
          isAuthenticated: true,
          user: response.data,
          accessToken: token,
          isLoading: false,
        });
      } else {
        setAuthToken(null);
        set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
      }
    } catch {
      setAuthToken(null);
      set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
    }
  },

  logout: async () => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setAuthToken(null);
    set({ isAuthenticated: false, user: null, accessToken: null });
    window.location.href = '/login';
  },

  setUser: (user: User, accessToken?: string) => {
    const token = accessToken || null;
    setAuthToken(token);
    set({ isAuthenticated: true, user, accessToken: token });
  },
}));

// Sync token on initialization if any (e.g. from persisted state if used)
// For now, it's enough to set it in actions.
