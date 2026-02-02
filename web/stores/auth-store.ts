import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessExpiresAt: number | null; // Unix timestamp in seconds
  serverTimeOffsetSec: number; // server_time - client_now (seconds)
  
  setAuthenticated: (user: User, accessExpiresAt?: number) => void;
  setUnauthenticated: () => void;
  setUser: (user: User) => void;
  setAccessExpiresAt: (expiresAt: number) => void;
  setServerTimeOffsetSec: (offsetSec: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'unknown',
      user: null,
      accessExpiresAt: null,
      serverTimeOffsetSec: 0,

      setAuthenticated: (user, accessExpiresAt) => set({ 
        status: 'authenticated', 
        user, 
        ...(accessExpiresAt ? { accessExpiresAt } : {}) 
      }),
      
      setUnauthenticated: () => set({ 
        status: 'unauthenticated', 
        user: null, 
        accessExpiresAt: null,
        serverTimeOffsetSec: 0,
      }),
      
      setUser: (user) => set({ user }),
      
      setAccessExpiresAt: (expiresAt) => set({ accessExpiresAt: expiresAt }),

      setServerTimeOffsetSec: (offsetSec) => set({ serverTimeOffsetSec: offsetSec }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        accessExpiresAt: state.accessExpiresAt,
        serverTimeOffsetSec: state.serverTimeOffsetSec,
        // status 不持久化，或者初始化为 unknown，由 hydrate 或页面逻辑决定
      }),
    }
  )
);
