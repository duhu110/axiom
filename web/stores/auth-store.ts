import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessExpiresAt: number | null; // Unix timestamp in seconds
  serverTimeOffsetSec: number; // server_time - client_now (seconds)
  _hasHydrated: boolean; // hydration 状态标记
  
  setAuthenticated: (user: User, accessExpiresAt?: number) => void;
  setUnauthenticated: () => void;
  setUser: (user: User) => void;
  setAccessExpiresAt: (expiresAt: number) => void;
  setServerTimeOffsetSec: (offsetSec: number) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'unknown',
      user: null,
      accessExpiresAt: null,
      serverTimeOffsetSec: 0,
      _hasHydrated: false,

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

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        accessExpiresAt: state.accessExpiresAt,
        serverTimeOffsetSec: state.serverTimeOffsetSec,
        // status 和 _hasHydrated 不持久化
      }),
      onRehydrateStorage: () => (state) => {
        // 当 hydration 完成时设置标记
        state?.setHasHydrated(true);
      },
    }
  )
);
