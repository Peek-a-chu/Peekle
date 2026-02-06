import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();

  try {
    const res = await fetch(`${API_BASE_URL}/api/studies?${queryString}`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    // Check Content-Type before parsing
    const contentType = res.headers.get('content-type') || '';

    // HTML이 반환된 경우 (에러 페이지 등)
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      const snippet = text.slice(0, 500).replace(/\s+/g, ' ');
      console.error(`[API Route] Non-JSON response from backend: ${contentType}`, snippet);

      // If it's HTML, it's likely an error page or authentication required
      if (contentType.includes('text/html')) {
        // Check if it's an authentication error (status 401 or 403)
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication required. Please log in first.',
              },
            },
            { status: 401 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_RESPONSE',
              message: `Expected JSON but got '${contentType}' (status ${res.status}) from /api/studies. Snippet: ${snippet}`,
            },
          },
          { status: res.status || 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: `Expected JSON but got '${contentType}' (status ${res.status})`,
          },
        },
        { status: res.status || 500 },
      );
    }

    // JSON 응답 파싱
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[API Route] Error fetching studies:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE_URL}/api/studies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
}
