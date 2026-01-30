import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || '';
  const source = searchParams.get('source') || 'BOJ';

  try {
    // 백엔드의 /api/problems/search 엔드포인트로 프록시
    const res = await fetch(
      `${API_BASE_URL}/api/problems/search?query=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
}
