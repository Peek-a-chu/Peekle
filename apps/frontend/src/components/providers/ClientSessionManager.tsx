'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { isPublicE2ERoute } from '@/lib/e2e-routes';

const AUTH_OR_PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

export function ClientSessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    if (!pathname || AUTH_OR_PUBLIC_ROUTES.has(pathname) || isPublicE2ERoute(pathname)) {
      return;
    }

    checkAuth();

    const handleAuthRefreshed = () => {
      router.refresh();
    };

    window.addEventListener('auth:refreshed', handleAuthRefreshed);

    return () => {
      window.removeEventListener('auth:refreshed', handleAuthRefreshed);
    };
  }, [pathname, router, checkAuth]);

  return null;
}
