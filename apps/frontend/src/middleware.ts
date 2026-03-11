import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/profile', '/study', '/home', '/game', '/workbooks', '/ranking', '/search', '/settings'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const isAuthenticated = request.cookies.get('is_authenticated')?.value;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Protected routes: allow when access token exists or refresh session marker exists.
  if (isProtectedRoute) {
    if (accessToken || isAuthenticated) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Auth/landing routes: redirect only when access token is present.
  // This avoids redirect loops caused by stale is_authenticated cookies.
  const isLandingPage = pathname === '/';
  if ((isAuthRoute || isLandingPage) && accessToken) {
    const homeUrl = new URL('/home', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/profile/:path*',
    '/study/:path*',
    '/home/:path*',
    '/game/:path*',
    '/workbooks/:path*',
    '/ranking/:path*',
    '/search/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
};
