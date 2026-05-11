'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

const AUTH_OR_PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

export function ClientSessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    if (!pathname || AUTH_OR_PUBLIC_ROUTES.has(pathname)) {
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
