'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ClientSessionManager() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthRefreshed = () => {
            // 토큰 갱신됨 -> 서버 컴포넌트(데이터) 새로고침
            router.refresh();
        };

        window.addEventListener('auth:refreshed', handleAuthRefreshed);

        return () => {
            window.removeEventListener('auth:refreshed', handleAuthRefreshed);
        };
    }, [router]);

    return null;
}
