import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

interface ValidateResponse {
  valid?: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token (body) required' }, { status: 400 });
    }

    const path = `/api/users/me/validate-token`;

    // Forward the token in the body as expected by the backend
    const result = await serverFetch<ValidateResponse>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!result.success) {
      console.error('Failed to validate token from backend:', result.error);
      return NextResponse.json({ error: 'Failed' }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in proxy route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
