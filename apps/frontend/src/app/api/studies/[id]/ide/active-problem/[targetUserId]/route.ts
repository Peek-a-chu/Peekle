import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; targetUserId: string }> },
) {
  const { id, targetUserId } = await params;

  try {
    const res = await fetch(`${API_BASE_URL}/api/studies/${id}/ide/active-problem/${targetUserId}`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
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
