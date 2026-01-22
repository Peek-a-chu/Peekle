import 'server-only';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  StudyLayoutHeader,
  StudyLayoutLeftPanel,
  StudyLayoutCenter,
  StudyLayoutRightPanel,
} from '@/domains/study/layout';

interface StudyLayoutProps {
  children: ReactNode;
  params: { id: string };
}

export default function StudyLayout({ children }: StudyLayoutProps) {
  return (
    <div className={cn('flex h-screen flex-col bg-background')}>
      <StudyLayoutHeader />
      <div className="relative flex min-h-0 flex-1">
        <StudyLayoutLeftPanel />
        <StudyLayoutCenter>{children}</StudyLayoutCenter>
        <StudyLayoutRightPanel />
      </div>
    </div>
  );
}
