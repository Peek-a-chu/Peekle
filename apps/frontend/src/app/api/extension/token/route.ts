import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const regenerate = body.regenerate || false;

        // 실제 백엔드 API 주소 (환경변수로 관리하는 것이 좋음, 일단 하드코딩)
        // 환경변수 사용
        const backendUrl = `${process.env.BACKEND_API_URL || 'http://localhost:8080'}/api/users/me/extension-token?regenerate=${regenerate}`;

        const res = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}` // 추후 인증 토큰 필요 시 추가
            },
        });

        if (!res.ok) {
            console.error('Failed to fetch token from backend:', res.status, res.statusText);
            return NextResponse.json({ error: 'Failed to generate token' }, { status: res.status });
        }

        const data = await res.json();
        // 백엔드 응답이 ApiResponse 구조이므로, data 객체를 그대로 반환하거나 필요한 부분만 추출
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in proxy route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
