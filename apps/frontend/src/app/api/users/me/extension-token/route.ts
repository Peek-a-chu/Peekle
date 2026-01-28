import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

interface TokenRequestBody {
  regenerate?: boolean;
}

interface TokenResponse {
  extensionToken?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as TokenRequestBody;
    const regenerate = body.regenerate || false;

    const path = `/api/users/me/extension-token?regenerate=${regenerate}`;

    // serverFetch now handles cookies automatically
    const result = await serverFetch<{ extensionToken: string }>(path, {
      method: 'POST'
    });

    if (!result.success) {
      console.error('Failed to fetch token from backend:', result.error);
      return NextResponse.json({ error: 'Failed' }, { status: result.status });
    }

    // Wrap the data in the expected structure for the frontend
    return NextResponse.json({ success: true, data: result.data });

  } catch (error) {
    console.error('Error in proxy route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
