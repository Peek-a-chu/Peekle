'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function ClientSessionManager() {
    const router = useRouter();
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        // 앱 초기 진입 시 인증 상태 확인
        checkAuth();

        const handleAuthRefreshed = () => {
            // 토큰 갱신됨 -> 서버 컴포넌트(데이터) 새로고침
            router.refresh();
        };

        window.addEventListener('auth:refreshed', handleAuthRefreshed);

        return () => {
            window.removeEventListener('auth:refreshed', handleAuthRefreshed);
        };
    }, [router, checkAuth]);

    return null;
}
