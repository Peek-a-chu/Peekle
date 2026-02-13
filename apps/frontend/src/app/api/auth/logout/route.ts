import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    // Backend call (optional, but good to notify server)
    // We ignore the result because we want to force logout on client anyway
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    }).catch((e) => console.error('Backend logout failed:', e));

    const response = NextResponse.json({ success: true });

    // Force clear cookies
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('is_authenticated');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
}
