import { NextResponse } from 'next/server';

interface TokenRequestBody {
    regenerate?: boolean;
}

interface TokenResponse {
    success?: boolean;
    data?: {
        extensionToken?: string;
    };
    error?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json().catch(() => ({}))) as TokenRequestBody;
        const regenerate = body.regenerate || false;

        const backendUrl = `${process.env.BACKEND_API_URL || 'http://localhost:8080'}/api/users/me/extension-token?regenerate=${regenerate}`;

        const res = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            console.error('Failed to fetch token from backend:', res.status, res.statusText);
            return NextResponse.json({ error: 'Failed to generate token' }, { status: res.status });
        }

        const data = (await res.json()) as TokenResponse;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in proxy route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
