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

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(decodedJson);
      
      const role = payload.role || payload.auth || '';
      if (!role.includes('ADMIN')) {
        return NextResponse.redirect(new URL('/home', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

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
    '/admin/:path*',
  ],
};
