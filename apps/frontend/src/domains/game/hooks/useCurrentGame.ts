'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface CurrentGameResponse {
    roomId: number;
    status: 'WAITING' | 'PLAYING' | 'END';
    title: string;
}

export function useCurrentGame() {
    return useQuery<CurrentGameResponse | null>({
        queryKey: ['currentGame'],
        queryFn: async () => {
            try {
                const response = await apiFetch<CurrentGameResponse>('/api/games/current');
                if (!response.success || !response.data) {
                    return null;
                }
                return response.data;
            } catch (error) {
                // 에러 발생 시 null 반환 (게임이 없는 경우)
                return null;
            }
        },
        staleTime: 0, // 항상 최신 데이터 조회
        gcTime: 0, // 캐시 사용 안 함
    });
}
