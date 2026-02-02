import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { loginAction, logoutAction, getMeAction } from '../server/actions';
import { LoginFormValues } from '../types';

export function useAuth() {
  const router = useRouter();
  const { setAuthenticated, setUnauthenticated, setServerTimeOffsetSec } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      // 1. Login to get tokens (cookies set by server action)
      const loginResult = await loginAction(values.phone, values.code);
      if (!loginResult.success || !loginResult.data) {
        throw new Error(loginResult.error || '登录失败');
      }

      // 2. Get User Info
      const userResult = await getMeAction();
      if (!userResult.success || !userResult.data) {
        throw new Error(userResult.error || '获取用户信息失败');
      }

      // 3. Update Store
      setAuthenticated(userResult.data, loginResult.data.access_expires_at);
      setServerTimeOffsetSec(loginResult.data.server_time - Math.floor(Date.now() / 1000));
      
      toast.success('登录成功');
      router.push('/'); // Or redirect to 'next' param
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, setAuthenticated, setServerTimeOffsetSec]);

  const logout = useCallback(async () => {
    try {
      await logoutAction();
      setUnauthenticated();
      router.push('/login');
      toast.success('已退出登录');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client side even if server fails
      setUnauthenticated();
      router.push('/login');
    }
  }, [router, setUnauthenticated]);

  return {
    login,
    logout,
    isLoading,
  };
}
