import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

interface ValidateResponse {
  valid?: boolean;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = request.headers.get('X-Peekle-Token');

    if (!token) {
      return NextResponse.json({ error: 'Token (header) required' }, { status: 400 });
    }

    const path = `/api/users/me/validate-token`;

    // Pass custom headers (X-Peekle-Token) along with automatic cookies
    const result = await serverFetch<ValidateResponse>(path, {
      method: 'GET',
      headers: {
        'X-Peekle-Token': token
      }
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
