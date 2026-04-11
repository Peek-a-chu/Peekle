import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  const target = new URL(`${API_BASE_URL}/api/cs${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  try {
    const headers: Record<string, string> = {
      Cookie: request.headers.get('cookie') || '',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
      if (body) {
        headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
      }
    }

    const response = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const snippet = text.slice(0, 500).replace(/\s+/g, ' ');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: `Expected JSON but got '${contentType || 'unknown'}' (status ${response.status}). Snippet: ${snippet}`,
          },
        },
        { status: response.status || 500 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Internal Server Error',
        },
      },
      { status: 500 },
    );
  }
}

async function resolvePath(params: Promise<{ path?: string[] }>): Promise<string[]> {
  const { path } = await params;
  return path || [];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(request, await resolvePath(params));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(request, await resolvePath(params));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(request, await resolvePath(params));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(request, await resolvePath(params));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(request, await resolvePath(params));
}
