'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: number;
  nickname: string;
  profileImg: string | null;
  bojId: string | null;
  league: string;
  leaguePoint: number;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const response = await fetch(`${backendUrl}/api/users/me`, {
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success && data.data) {
          setUser(data.data);
          // 콘솔에 유저 정보 출력
          console.log('===== 로그인된 유저 정보 =====');
          console.log(data.data);
          console.log('==============================');
        } else {
          setError('로그인이 필요합니다.');
          router.push('/login');
        }
      } catch (err) {
        console.error('유저 정보 조회 실패:', err);
        setError('서버 연결에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log('로그아웃 완료');
      router.push('/');
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
      <div className="w-full max-w-[440px] px-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-10 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              테스트 홈 페이지
            </h1>
            <p className="text-slate-500 text-[15px]">
              (다른 팀원이 나중에 home 구현 예정)
            </p>
          </div>

          {user && (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <h2 className="font-semibold text-slate-700 mb-2">로그인된 유저 정보</h2>
              <div className="text-sm space-y-1">
                <p><span className="text-slate-500">ID:</span> {user.id}</p>
                <p><span className="text-slate-500">닉네임:</span> {user.nickname}</p>
                <p><span className="text-slate-500">백준 ID:</span> {user.bojId || '(미등록)'}</p>
                <p><span className="text-slate-500">리그:</span> {user.league}</p>
                <p><span className="text-slate-500">리그 포인트:</span> {user.leaguePoint}</p>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                * 콘솔(F12)에서도 유저 정보 확인 가능
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full h-[52px] bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg"
          >
            로그아웃 테스트
          </button>
        </div>
      </div>
    </div>
  );
}
