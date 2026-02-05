import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/profile', '/study', '/home', '/game', '/workbooks', '/ranking', '/search', '/settings'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  // refresh_token은 path=/api/auth/refresh 로 설정되어 있어 미들웨어에서 접근 불가할 수 있음
  // 대신 is_authenticated 쿠키를 확인하여 로그인 세션이 유지되고 있는지 판단
  const isAuthenticated = request.cookies.get('is_authenticated')?.value; // "true"

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // 1. 보호된 라우트 접근 시
  if (isProtectedRoute) {
    if (accessToken) {
      // Access Token이 있으면 통과
      return NextResponse.next();
    }

    if (isAuthenticated) {
      // Access Token은 없지만(만료됨) 인증 세션(Refresh Token 존재 가능성)이 있다면 통과
      // 클라이언트(api.ts)에서 401 발생 시 자동으로 Refresh Token으로 갱신 시도함
      return NextResponse.next();
    }

    // 둘 다 없으면 로그인 필요
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 로그인된 상태에서 로그인/회원가입 페이지 접근 시 홈으로 리다이렉트
  if (isAuthRoute && (accessToken || isAuthenticated)) {
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
