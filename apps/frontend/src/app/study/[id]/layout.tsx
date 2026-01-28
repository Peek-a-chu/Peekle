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
  params: Promise<{ id: string }>;
}

export default function StudyLayout({ children }: StudyLayoutProps) {
  return <>{children}</>;
}
