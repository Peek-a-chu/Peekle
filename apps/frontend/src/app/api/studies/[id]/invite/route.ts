import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = request.headers.get('cookie') || '';
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/studies/${id}/invite`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
      redirect: 'manual', // Prevent automatic redirects
    });

    const contentType = res.headers.get('content-type') || '';
    const status = res.status;
    
    // Handle redirects (likely authentication redirect)
    if (status >= 300 && status < 400) {
      const location = res.headers.get('location');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: `Authentication required. Redirected to: ${location || 'login page'}`,
          },
        },
        { status: 401 },
      );
    }
    
    // Check if response is JSON
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      const snippet = text.slice(0, 500).replace(/\s+/g, ' ');
      console.error('[Invite API] Non-JSON response:', { status, contentType, snippet });
      
      // If it's HTML, it's likely a login page
      if (contentType.includes('text/html')) {
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
            message: `Expected JSON but got '${contentType}' (status ${status}) from backend. Snippet: ${snippet}`,
          },
        },
        { status: status || 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Internal Server Error',
        },
      },
      { status: 500 },
    );
  }
}
