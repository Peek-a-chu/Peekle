'use client';

import dynamic from 'next/dynamic';

import { useSettingsModalHost } from '@/domains/settings/hooks/useSettingsModalHost';

const SettingsModal = dynamic(() => import('@/domains/settings/components/SettingsModal'), {
  ssr: false,
  loading: () => null,
});

interface SettingsModalHostProps {
  isGlobal?: boolean;
}

export function SettingsModalHost({ isGlobal = false }: SettingsModalHostProps) {
  const { shouldRender } = useSettingsModalHost({ isGlobal });

  if (!shouldRender) return null;

  return <SettingsModal isGlobal={isGlobal} />;
}
