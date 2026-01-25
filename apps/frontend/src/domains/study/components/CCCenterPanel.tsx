'use client';

import { useRef, useEffect, useState } from 'react';
import { type ReactNode } from 'react';
import { useCenterPanel } from '@/domains/study/hooks/useCenterPanel';
import { CCVideoGrid as VideoGrid } from '@/domains/study/components/CCVideoGrid';
import { CCControlBar as ControlBar } from '@/domains/study/components/CCControlBar';
import { CCIDEPanel as IDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { useRealtimeCode } from '@/domains/study/hooks/useRealtimeCode';
import { useSocket } from '@/domains/study/hooks/useSocket';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CCCenterPanelProps {
  ideContent?: ReactNode;
  onWhiteboardClick?: () => void;
  onMicToggle?: () => void;
  onVideoToggle?: () => void;
  onWhiteboardToggle?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function CCCenterPanel({
  ideContent,
  onWhiteboardClick,
  onMicToggle,
  onVideoToggle,
  onWhiteboardToggle,
  onSettingsClick,
  className,
}: CCCenterPanelProps) {
  const {
    isVideoGridFolded,
    toggleVideoGrid,
    viewMode,
    viewingUser,
    targetSubmission,
    resetToOnlyMine,
    language,
    setLanguage,
    theme,
    handleThemeToggle,
    leftPanelRef,
    isViewingOther,
    handleCopy,
    handleSubmit,
    handleRefChat,
  } = useCenterPanel();

  const realtimeCode = useRealtimeCode(viewingUser);
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const socket = useSocket(roomId, currentUserId);

  // Track my latest code to respond to pull requests
  const myLatestCodeRef = useRef<string>('');
  const [restoredCode, setRestoredCode] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleRequestCode = (data: { requesterId: string; targetUserId: number }) => {
      // If someone is asking for MY code
      if (data.targetUserId === currentUserId) {
        // Send what I have
        socket.emit('code-change', {
          roomId: String(roomId),
          code: myLatestCodeRef.current,
        });
      }
    };

    socket.on('request-code', handleRequestCode);

    // [New] Restore my code if the server has it
    const handleCodeRestore = (data: { code: string; language?: string }) => {
      console.log('Restoring code...', data.code);
      if (data.code) {
        setRestoredCode(data.code);
      }
      if (data.language) {
        console.log('Restoring language...', data.language);
        setLanguage(data.language);
      }
    };
    socket.on('code-restore', handleCodeRestore);

    return () => {
      socket.off('request-code', handleRequestCode);
      socket.off('code-restore', handleCodeRestore);
    };
  }, [socket, currentUserId, roomId]);

  const handleCodeChange = (code: string) => {
    myLatestCodeRef.current = code;
    if (socket && roomId) {
      socket.emit('code-change', { roomId: String(roomId), code });
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (socket && roomId) {
      console.log('Emitting language-change:', lang);
      socket.emit('language-change', { roomId: String(roomId), language: lang });
    }
  };

  return (
    <div className={cn('flex h-full flex-col min-w-0 min-h-0', className)}>
      {/* Video Grid Header */}
      <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0">
        <span className="text-sm font-medium">화상 타일</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleVideoGrid}
          title={isVideoGridFolded ? '화상 타일 펼치기' : '화상 타일 접기'}
        >
          {isVideoGridFolded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Video Grid */}
      {!isVideoGridFolded && <VideoGrid onWhiteboardClick={onWhiteboardClick} />}

      {/* IDE Area */}
      <div className="relative flex min-h-0 flex-1 flex-col min-w-0 bg-background">
        {/* Header Row: Always show toolbar for Left IDE.  
            If isViewingOther, the toolbar layout adapts to show View Mode Banner on left and Tools on right. */}
        <div className="flex h-14 shrink-0 border-b border-border bg-card">
          <div className="w-full">
            <IDEToolbar
              language={language}
              theme={theme}
              // Conditional Props based on View Mode
              viewingUser={isViewingOther ? viewingUser : null}
              viewMode={viewMode}
              targetSubmission={targetSubmission}
              onResetView={resetToOnlyMine}
              // Standard Handlers
              onLanguageChange={(lang) => leftPanelRef.current?.setLanguage(lang)}
              onThemeToggle={handleThemeToggle}
              onCopy={() => {
                void handleCopy();
              }}
              onRefChat={() => {
                void handleRefChat();
              }}
              onSubmit={() => {
                void handleSubmit();
              }}
              // Toggles
              showSubmit={!isViewingOther}
              showChatRef={!isViewingOther}
            />
          </div>
        </div>

        {/* Editor Body Row */}
        <div className="flex min-h-0 flex-1 min-w-0">
          {/* Left IDE Panel (My Code) */}
          <div className={cn('flex-1 min-w-0', isViewingOther && 'border-r border-border')}>
            {ideContent ?? (
              <IDEPanel
                ref={leftPanelRef}
                editorId="my-editor"
                language={language}
                onLanguageChange={handleLanguageChange}
                theme={theme}
                hideToolbar // Pass this so it doesn't render double toolbar
                onCodeChange={handleCodeChange}
                restoredCode={restoredCode}
              />
            )}
          </div>

          {/* Right IDE Panel (Other's Code - Read Only) */}
          {isViewingOther && (
            <div className="flex-1 min-w-0">
              <IDEPanel
                editorId="other-editor"
                readOnly
                hideToolbar
                initialCode={viewMode === 'SPLIT_SAVED' ? targetSubmission?.code : realtimeCode}
                theme={theme} // Sync theme
                borderColorClass={
                  viewMode === 'SPLIT_SAVED' ? 'border-indigo-400' : 'border-pink-400'
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <ControlBar
        onMicToggle={onMicToggle}
        onVideoToggle={onVideoToggle}
        onWhiteboardToggle={onWhiteboardToggle}
        onSettingsClick={onSettingsClick}
      />
    </div>
  );
}
