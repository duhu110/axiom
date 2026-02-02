import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TokenPayload } from '@/types/auth';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ code: 401, msg: 'No refresh token' }, { status: 401 });
  }

  try {
    // Call backend refresh endpoint
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Backend expects access token in Authorization header, 
        // but for refresh endpoint it might expect refresh token in body 
        // OR access token in header (even if expired).
        // Let's assume standard OAuth2: refresh token in body.
        // Wait, design doc says: 
        // "需要 Authorization: Bearer <access_token> 且 body 传 refresh_token"
        // This is tricky if access token is missing from cookie (expired/deleted).
        // Let's try to get access token, even if expired.
        'Authorization': `Bearer ${cookieStore.get('access_token')?.value || ''}`
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed
      return NextResponse.json({ code: 401, msg: 'Refresh failed' }, { status: 401 });
    }

    const result = await response.json();
    if (result.code !== 0) {
      return NextResponse.json(result, { status: 400 });
    }

    const tokenData: TokenPayload = result.data;

    // Update cookies
    cookieStore.set('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in,
    });

    // Refresh token might be rotated
    if (tokenData.refresh_token) {
      cookieStore.set('refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, 
      });
    }

    return NextResponse.json({ code: 0, msg: 'ok', data: tokenData });

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ code: 500, msg: 'Internal server error' }, { status: 500 });
  }
}
