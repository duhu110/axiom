/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError, AuthError, NetworkError, ApiResponse } from '@/types/api';

const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...init.headers,
  };

  try {
    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = await response.json().catch(() => null);
        const msg = payload?.msg || payload?.detail || 'Session expired or unauthorized';
        throw new AuthError(msg, payload);
      }

      const text = await response.text().catch(() => '');
      throw new AuthError(text || 'Session expired or unauthorized');
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const data: ApiResponse<T> = await response.json();

    if (data.code !== 0) {
      // 特殊处理业务层面的认证错误
      if (data.code === 10003 || data.code === 10005) {
        throw new AuthError(data.msg, data.data);
      }
      throw new ApiError(data.code, data.msg, data.data);
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError || error instanceof AuthError) {
      throw error;
    }
    throw new NetworkError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: <T>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
