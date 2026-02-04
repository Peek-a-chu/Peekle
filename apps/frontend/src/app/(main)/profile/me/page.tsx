'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileMePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // 만약 로딩이 끝났는데 로그인이 안되어 있다면 재확인 시도
    if (!isLoading && !isAuthenticated) {
      checkAuth();
    }
  }, [isLoading, isAuthenticated, checkAuth]);

  useEffect(() => {
    if (user && user.nickname) {
      router.replace(`/profile/${user.nickname}`);
    }
  }, [user, router]);

  return (
    <div className="flex w-full h-full items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">프로필로 이동 중...</p>
      </div>
    </div>
  );
}
