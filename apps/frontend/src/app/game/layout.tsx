export const dynamic = 'force-dynamic';

import { DesktopOnlyOverlay } from '@/components/common/DesktopOnlyOverlay';

export default function GameRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopOnlyOverlay />
      {children}
    </>
  );
}
