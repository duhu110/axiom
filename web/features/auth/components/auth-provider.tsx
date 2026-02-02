"use client"

import * as React from "react"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"
import { TokenPayload } from "@/types/auth"
import { AuthError } from "@/types/api"
import { useRouter } from "next/navigation"

// Refresh skew in seconds (refresh 60s before expiration)
const REFRESH_SKEW = 60;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessExpiresAt, serverTimeOffsetSec, setAccessExpiresAt, setServerTimeOffsetSec, setUnauthenticated } = useAuthStore();
  const router = useRouter();
  const refreshTimerRef = React.useRef<NodeJS.Timeout>(null);

  const scheduleRefresh = React.useCallback(() => {
    if (!accessExpiresAt) return;

    const now = Math.floor(Date.now() / 1000) + (serverTimeOffsetSec || 0);
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
        setServerTimeOffsetSec(data.server_time - Math.floor(Date.now() / 1000));
        // Reschedule
        // scheduleRefresh() will be triggered by useEffect dependency on accessExpiresAt
      } catch (error) {
        if (error instanceof AuthError && (error.message === 'No access token' || error.message === 'No refresh token')) {
          setUnauthenticated();
          router.push('/login');
          return;
        }
        console.error('[Auth] Refresh failed:', error);
        setUnauthenticated();
        router.push('/login');
      }
    }, delay);
  }, [accessExpiresAt, serverTimeOffsetSec, setAccessExpiresAt, setServerTimeOffsetSec, setUnauthenticated, router]);

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
