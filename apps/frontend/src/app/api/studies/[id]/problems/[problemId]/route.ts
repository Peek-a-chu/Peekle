import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; problemId: string }> },
) {
  const { id, problemId } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/api/studies/${id}/problems/${problemId}`, {
      method: 'DELETE',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    // DELETE might return 204 No Content
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => ({})); // Handle empty body
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
}
