import { notFound } from 'next/navigation';

import { isE2ERoutesEnabled } from '@/lib/e2e-routes';

export default function E2ELayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isE2ERoutesEnabled) {
    notFound();
  }

  return children;
}
