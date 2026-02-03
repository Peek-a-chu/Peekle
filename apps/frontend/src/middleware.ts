import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/profile', '/study', '/home', '/game', '/workbooks', '/ranking', '/search', '/settings'];
const authRoutes = ['/login', '/signup'];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // access_token 없고 refresh_token 있으면 → 토큰 갱신 시도
  if (isProtectedRoute && !accessToken && refreshToken) {
    try {
      const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (refreshResponse.ok) {
        // 백엔드에서 Set-Cookie 헤더로 새 토큰 전달
        const setCookieHeader = refreshResponse.headers.get('set-cookie');

        if (setCookieHeader) {
          // 요청 계속 진행하면서 새 쿠키 설정
          const response = NextResponse.next();

          // 여러 쿠키가 있을 수 있으므로 분리해서 설정
          const cookies = setCookieHeader.split(/,(?=\s*\w+=)/);
          cookies.forEach((cookie) => {
            response.headers.append('Set-Cookie', cookie.trim());
          });

          return response;
        }
      }
    } catch (error) {
      console.error('Token refresh failed in middleware:', error);
    }

    // refresh 실패 시 로그인 페이지로
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // access_token도 없고 refresh_token도 없으면 → 로그인 필요
  if (isProtectedRoute && !accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 이미 로그인된 상태에서 로그인/회원가입 페이지 접근 → 홈으로
  if (isAuthRoute && accessToken) {
    const homeUrl = new URL('/home', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/study/:path*',
    '/home/:path*',
    '/game/:path*',
    '/workbooks/:path*',
    '/ranking/:path*',
    '/search/:path*',
    '/settings/:path*',
    '/api/:path*',
    '/login',
    '/signup',
  ],
};
