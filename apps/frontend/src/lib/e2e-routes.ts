export const isE2ERoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_E2E_ROUTES === 'true';

export function isE2ERoutePath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && pathname.startsWith('/e2e/'));
}

export function isPublicE2ERoute(pathname: string | null | undefined): boolean {
  return isE2ERoutesEnabled && isE2ERoutePath(pathname);
}
