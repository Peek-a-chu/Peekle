import { NextResponse } from 'next/server';

interface ValidateResponse {
    success?: boolean;
    data?: {
        valid?: boolean;
    };
    error?: string;
}

export async function GET(request: Request): Promise<NextResponse> {
    try {
        const token = request.headers.get('X-Peekle-Token');

        if (!token) {
            return NextResponse.json({ error: 'Token (header) required' }, { status: 400 });
        }

        const backendUrl = `${process.env.BACKEND_API_URL || 'http://localhost:8080'}/api/users/me/validate-token`;

        const res = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Peekle-Token': token,
            },
        });

        if (!res.ok) {
            console.error('Failed to validate token from backend:', res.status);
            return NextResponse.json({ error: 'Failed' }, { status: res.status });
        }

        const data = (await res.json()) as ValidateResponse;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in proxy route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
