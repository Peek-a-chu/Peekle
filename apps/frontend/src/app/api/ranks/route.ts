import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();

  try {
    const res = await fetch(`${API_BASE_URL}/api/ranks?${queryString}`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      const snippet = text.slice(0, 500).replace(/\s+/g, ' ');
      console.error(`[API Route] Non-JSON response from backend: ${contentType}`, snippet);

      if (contentType.includes('text/html')) {
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
              message: `Expected JSON but got '${contentType}' (status ${res.status}) from /api/ranks. Snippet: ${snippet}`,
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

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[API Route] Error fetching rankings:', error);
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
