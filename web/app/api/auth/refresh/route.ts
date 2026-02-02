import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TokenPayload } from '@/types/auth';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;

  if (!refreshToken) {
    console.warn('[AuthRefresh] Missing refresh_token cookie');
    return NextResponse.json({ code: 401, msg: 'No refresh token' }, { status: 401 });
  }

  if (!accessToken) {
    console.warn('[AuthRefresh] Missing access_token cookie');
    return NextResponse.json({ code: 401, msg: 'No access token' }, { status: 401 });
  }

  try {
    // Call backend refresh endpoint
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      let msg = `Refresh failed: ${response.status}`;

      if (contentType.includes('application/json')) {
        const payload = await response.json().catch(() => null);
        msg = payload?.msg || payload?.detail || msg;
      } else {
        const text = await response.text().catch(() => '');
        msg = text || msg;
      }

      console.warn('[AuthRefresh] Backend refresh failed', { status: response.status, msg });
      return NextResponse.json({ code: response.status, msg }, { status: response.status });
    }

    const result = await response.json();
    if (result.code !== 0) {
      return NextResponse.json(result, { status: 400 });
    }

    const tokenData: TokenPayload = result.data;

    const res = NextResponse.json({ code: 0, msg: 'ok', data: tokenData });

    res.cookies.set('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in,
    });

    // Refresh token might be rotated
    if (tokenData.refresh_token) {
      res.cookies.set('refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, 
      });
    }

    return res;

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ code: 500, msg: 'Internal server error' }, { status: 500 });
  }
}
