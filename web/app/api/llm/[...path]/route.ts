/**
 * LLM API 代理路由
 * 将 /api/llm/* 请求代理到后端，并自动添加认证头
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

async function proxyRequest(
  request: NextRequest,
  method: string
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  // 构建目标 URL
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const targetUrl = `${API_BASE_URL}${pathname}${search}`;

  // 构建请求头
  const headers: Record<string, string> = {};

  // 添加认证头
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // 复制原始请求头
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // 构建请求配置
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // 处理请求体
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      fetchOptions.body = formData;
      delete headers['Content-Type'];
    } else if (contentType.includes('application/json')) {
      const body = await request.text();
      fetchOptions.body = body;
    } else {
      const body = await request.arrayBuffer();
      fetchOptions.body = body;
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const responseData = await response.arrayBuffer();

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[LLM Proxy] Error:', error);
    return NextResponse.json(
      { code: -1, msg: 'Proxy error', data: null },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE');
}
