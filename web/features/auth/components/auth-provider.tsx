"use client"

import * as React from "react"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"
import { TokenPayload } from "@/types/auth"
import { useRouter } from "next/navigation"

// Refresh skew in seconds (refresh 60s before expiration)
const REFRESH_SKEW = 60;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessExpiresAt, setAccessExpiresAt, setUnauthenticated } = useAuthStore();
  const router = useRouter();
  const refreshTimerRef = React.useRef<NodeJS.Timeout>(null);

  const scheduleRefresh = React.useCallback(() => {
    if (!accessExpiresAt) return;

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = accessExpiresAt - now - REFRESH_SKEW;
    const delay = Math.max(0, timeLeft * 1000);

    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    console.log(`[Auth] Scheduling refresh in ${delay}ms`);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        console.log('[Auth] Refreshing token...');
        const data = await api.post<TokenPayload>('/auth/refresh');
        console.log('[Auth] Token refreshed');
        setAccessExpiresAt(data.access_expires_at);
        // Reschedule
        // scheduleRefresh() will be triggered by useEffect dependency on accessExpiresAt
      } catch (error) {
        console.error('[Auth] Refresh failed:', error);
        setUnauthenticated();
        router.push('/login');
      }
    }, delay);
  }, [accessExpiresAt, setAccessExpiresAt, setUnauthenticated, router]);

  React.useEffect(() => {
    scheduleRefresh();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleRefresh]);

  return <>{children}</>;
}
