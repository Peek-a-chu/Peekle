import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Authorization 헤더도 전달 (JWT 토큰)
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      Cookie: request.headers.get('cookie') || '',
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await fetch(`${API_BASE_URL}/api/studies/${id}/chats`, {
      headers,
      cache: 'no-store',
    });

    // Content-Type 확인
    const contentType = res.headers.get('content-type') || '';
    
    // HTML이 반환된 경우 (에러 페이지 등)
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error(`[API Route] Non-JSON response from backend: ${contentType}`, text.slice(0, 200));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: `Backend returned ${contentType} instead of JSON. Status: ${res.status}`,
          },
        },
        { status: res.status || 500 },
      );
    }

    // JSON 응답 파싱
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[API Route] Error fetching chats:', error);
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
