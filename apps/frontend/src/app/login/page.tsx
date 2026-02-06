'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getOAuthLoginUrl } from '@/api/authApi';

export default function LoginPage() {
  const handleLogin = (provider: 'kakao' | 'naver' | 'google') => {
    const redirectUri = window.location.origin;
    window.location.href = getOAuthLoginUrl(provider, redirectUri);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background font-sans selection:bg-primary/20 selection:text-primary">
      {/* 2. 로그인 카드 (글래스모피즘) */}
      <div className="w-full max-w-[440px] z-10 px-4">
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-8 md:p-10 space-y-8">
          {/* --- 헤더 --- */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                오늘도 <span className="text-primary">힐끔힐끔코딩</span>과 함께 👀
              </h1>
              <p className="text-muted-foreground text-[15px] font-medium">
                간편하게 로그인하고 시작하세요
              </p>
            </div>
          </div>

          {/* --- 소셜 로그인 버튼 영역 --- */}
          <div className="space-y-3">
            {/* 1. 카카오 (가장 많이 쓰므로 강조) */}
            <button
              onClick={() => handleLogin('kakao')}
              className="relative w-full h-[52px] bg-[#FEE500] hover:bg-[#FDD835] text-[#391B1B] font-bold rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-lg active:brightness-95"
            >
              <div className="absolute left-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.76 1.865 5.216 4.743 6.645L5.86 20.89h.005a.65.65 0 0 0 .964.693l3.665-2.42c.49.068.992.102 1.506.102 5.523 0 10-3.477 10-7.765C22 6.477 17.523 3 12 3z" />
                </svg>
              </div>
              <span className="text-[15px]">카카오로 3초 만에 시작</span>
            </button>

            {/* 2. 네이버 */}
            <button
              onClick={() => handleLogin('naver')}
              className="relative w-full h-[52px] bg-[#03C75A] hover:bg-[#02b351] text-white font-bold rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-lg active:brightness-95"
            >
              <div className="absolute left-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
              </div>
              <span className="text-[15px]">네이버로 계속하기</span>
            </button>

            {/* 3. 구글 */}
            <button
              onClick={() => handleLogin('google')}
              className="relative w-full h-[52px] bg-card border border-border hover:bg-muted/50 text-foreground font-semibold rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-md active:brightness-95"
            >
              <div className="absolute left-6">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <span className="text-[15px]">Google로 계속하기</span>
            </button>
          </div>

          {/* 뒤로 가기 버튼 */}
          <div className="pt-4">
            <Link href="/">
              <button className="w-full h-11 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                <span>메인으로 돌아가기</span>
              </button>
            </Link>
          </div>
        </div>

        {/* 하단 저작권 (카드 밖으로 빼서 여유롭게) */}
        <p className="text-center text-muted-foreground text-xs mt-8 opacity-60">
          © 2026 Peekle. All rights reserved.
        </p>
      </div>
    </div>
  );
}
