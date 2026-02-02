'use server';

import { cookies } from 'next/headers';
import { ApiResponse } from '@/types/api';
import { TokenPayload, User } from '@/types/auth';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

async function fetchBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Backend Error [${endpoint}]:`, response.status, errorText);
    throw new Error(`Request failed: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();
  if (result.code !== 0) {
    throw new Error(result.msg || 'Operation failed');
  }

  return result.data;
}

export async function sendSmsAction(phone: string) {
  try {
    await fetchBackend('/api/auth/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '发送失败' };
  }
}

export async function loginAction(phone: string, code: string) {
  try {
    const tokenData = await fetchBackend<TokenPayload>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });

    const cookieStore = await cookies();
    
    // Set Access Token
    cookieStore.set('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in,
    });

    // Set Refresh Token
    cookieStore.set('refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 假设 refresh token 7天有效，具体应参考后端
    });

    return { success: true, data: tokenData };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '登录失败' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (accessToken) {
    // Fire-and-forget logout to backend
    fetchBackend('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(console.error);
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  
  return { success: true };
}

export async function getMeAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const user = await fetchBackend<User>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: 'Failed to fetch user' };
  }
}
