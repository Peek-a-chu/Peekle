import 'server-only';
import { ReactNode } from 'react';

interface StudyLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Study room layout - No LNB (Left Navigation Bar)
 * This layout is separate from (main) group to ensure LNB is not shown
 */
export default function StudyLayout({ children }: StudyLayoutProps) {
  // Render without LNB - full width layout for immersive study room experience
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
}
