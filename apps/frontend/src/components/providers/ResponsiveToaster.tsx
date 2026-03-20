'use client';

import { Toaster } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';

export function ResponsiveToaster() {
  const isMobile = useIsMobile();

  return <Toaster position={isMobile ? 'top-right' : 'bottom-right'} />;
}
