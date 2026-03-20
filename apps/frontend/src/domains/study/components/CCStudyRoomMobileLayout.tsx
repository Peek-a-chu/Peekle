'use client';

import { ReactNode, useEffect } from 'react';
import { MessageSquare, ListTodo, Video, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

interface CCStudyRoomMobileLayoutProps {
  header: ReactNode | null;
  centerPanel: ReactNode | null;
  problemPanel: ReactNode | null;
  chatPanel: ReactNode | null;
}

export function CCStudyRoomMobileLayout({
  header,
  centerPanel,
  problemPanel,
  chatPanel,
}: CCStudyRoomMobileLayoutProps) {
  const mobileTab = useRoomStore((state) => state.mobileTab);
  const setMobileTab = useRoomStore((state) => state.setMobileTab);
  const viewMode = useRoomStore((state) => state.viewMode);

  useEffect(() => {
    if (viewMode === 'SPLIT_REALTIME' || viewMode === 'SPLIT_SAVED') {
      setMobileTab('code');
    }
  }, [viewMode, setMobileTab]);

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground overflow-hidden w-full">
      {header && <header className="shrink-0 border-b border-border">{header}</header>}

      <main className="relative flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        {/* Render content based on active tab */}
        {/* CenterPanel internally toggles its layout based on whether 'video' or 'code' is active */}
        {(mobileTab === 'video' || mobileTab === 'code') && centerPanel}
        
        {/* Full width panel for problem list */}
        {mobileTab === 'problems' && (
          <div className="absolute inset-0 z-10 bg-card overflow-hidden w-full">
            {problemPanel}
          </div>
        )}
        
        {/* Full width panel for chat and participants */}
        {mobileTab === 'chat' && (
          <div className="absolute inset-0 z-10 bg-card overflow-hidden w-full">
            {chatPanel}
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="shrink-0 flex items-center justify-around border-t border-border bg-card h-[64px] pb-safe z-50 w-full shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setMobileTab('video')}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
            mobileTab === 'video' ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          <Video className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">화상</span>
        </button>
        
        <button
          onClick={() => setMobileTab('code')}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
            mobileTab === 'code' ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          <Code2 className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">코드</span>
        </button>
        
        <button
          onClick={() => setMobileTab('problems')}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
            mobileTab === 'problems' ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          <ListTodo className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">문제</span>
        </button>
        
        <button
          onClick={() => setMobileTab('chat')}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
            mobileTab === 'chat' ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">소통</span>
        </button>
      </nav>
    </div>
  );
}
