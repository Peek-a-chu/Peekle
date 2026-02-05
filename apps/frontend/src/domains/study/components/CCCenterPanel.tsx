'use client';

import { useRef, useEffect, useState } from 'react';
import { type ReactNode } from 'react';
import { useCenterPanel } from '@/domains/study/hooks/useCenterPanel';
import { CCVideoGrid as VideoGrid } from '@/domains/study/components/CCVideoGrid';
import { CCControlBar as ControlBar } from '@/domains/study/components/CCControlBar';
import { CCIDEPanel as IDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { WhiteboardPanel } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useRealtimeCode } from '@/domains/study/hooks/useRealtimeCode';
import { useSocket } from '@/domains/study/hooks/useSocket';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';

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

  const { code: realtimeCode, language: realtimeLanguage } = useRealtimeCode(
    viewMode === 'SPLIT_REALTIME' ? viewingUser : null,
  );
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const selectedProblemExternalId = useRoomStore((state) => state.selectedProblemExternalId);
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const socket = useSocket(roomId, currentUserId);

  // [Fix] Whiteboard is only visible when a problem is selected
  const isWhiteboardVisible = isWhiteboardOverlayOpen && !!selectedProblemTitle;

  // Show right panel when viewing other's code OR whiteboard is open
  const showRightPanel = isViewingOther || isWhiteboardVisible;

  // Track my latest code to respond to pull requests
  const myLatestCodeRef = useRef<string>('');
  const [restoredCode, setRestoredCode] = useState<string | null>(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const previousProblemIdRef = useRef<number | null>(null);

  // [Problem Selection] Save current code before switching, then request new problem's code
  const handleCodeChange = (code: string): void => {
    myLatestCodeRef.current = code;
    if (socket && roomId && selectedStudyProblemId) {
      socket.publish({
        destination: '/pub/ide/update',
        body: JSON.stringify({ problemId: selectedStudyProblemId, code }),
      });
    }
  };

  const handleLanguageChange = (lang: string): void => {
    setLanguage(lang);
  };

  const handleWhiteboardToggleWrapper = () => {
    if (!selectedProblemTitle) {
      toast.error('문제를 먼저 선택해주세요.');
      return;
    }
    onWhiteboardToggle?.();
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
      <div
        className="relative flex min-h-0 flex-1 flex-col min-w-0 bg-background"
        data-tour="ide-panel"
      >
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
              disabled={!selectedProblemTitle && !isViewingOther}
              problemExternalId={selectedProblemExternalId}
              // Standard Handlers
              onLanguageChange={(lang) => leftPanelRef.current?.setLanguage(lang)}
              onThemeToggle={handleThemeToggle}
              onCopy={() => {
                void handleCopy();
              }}
              onRefChat={() => {
                const currentSelectedProblemTitle = useRoomStore.getState().selectedProblemTitle;

                if (isViewingOther) {
                  // Smart Ref Chat: Capture other's code
                  const code =
                    viewMode === 'SPLIT_SAVED'
                      ? (targetSubmission?.code ?? '')
                      : (realtimeCode ?? '');
                  const lang =
                    viewMode === 'SPLIT_SAVED'
                      ? (targetSubmission?.language ?? 'python')
                      : (realtimeLanguage ?? 'python');

                  // For bots, we want to include (Bot) and for saved submissions, indicate it's stored code
                  let ownerName =
                    viewMode === 'SPLIT_SAVED' ? targetSubmission?.username : viewingUser?.nickname;

                  let resolvedProblemTitle = currentSelectedProblemTitle || 'Unknown Problem';
                  let resolvedProblemId = useRoomStore.getState().selectedStudyProblemId ?? undefined;

                  if (viewMode === 'SPLIT_SAVED' && targetSubmission) {
                    const isBot =
                      targetSubmission.username === 'PS러버' ||
                      targetSubmission.username === 'CodeNinja';
                    ownerName = `${targetSubmission.username}${isBot ? ' (Bot)' : ''}의 저장된 코드`;

                    if (targetSubmission.problemTitle) {
                      resolvedProblemTitle = targetSubmission.problemTitle;
                    }
                    if (targetSubmission.problemId) {
                      resolvedProblemId = targetSubmission.problemId;
                    }
                  }

                  useRoomStore.getState().setPendingCodeShare({
                    code,
                    language: lang || 'python', // Fallback or infer
                    ownerName: ownerName || 'Unknown',
                    problemTitle: resolvedProblemTitle,
                    problemId: resolvedProblemId,
                    problemExternalId: selectedProblemId ? String(selectedProblemId) : undefined, // Using actual problemId as externalId fallback
                    externalId: selectedProblemExternalId || undefined,
                    isRealtime: viewMode === 'SPLIT_REALTIME',
                  });
                  useRoomStore.getState().setRightPanelActiveTab('chat');
                  setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) chatInput.focus();
                  }, 0);
                } else {
                  // Capture My Code
                  void handleRefChat();

                  // Enhancing pending share with problem title
                  setTimeout(() => {
                    const currentPending = useRoomStore.getState().pendingCodeShare;
                    if (currentPending) {
                      useRoomStore.getState().setPendingCodeShare({
                        ...currentPending,
                        problemTitle: currentSelectedProblemTitle || 'Unknown Problem',
                        problemId: useRoomStore.getState().selectedStudyProblemId ?? undefined,
                        externalId: selectedProblemExternalId || undefined,
                        isRealtime: true, // Own code is treated as realtime capable
                      });
                    }
                  }, 0);
                }
              }}
              onSubmit={() => {
                void handleSubmit();
              }}
              // Toggles
              showSubmit={!isViewingOther}
              showChatRef={true} // Always show Ref Chat
            />
          </div>
        </div>

        {/* Editor Body Row */}
        <div className="flex min-h-0 flex-1 min-w-0 relative">
          {/* Left IDE Panel (My Code) */}
          <div
            className={cn('flex-1 min-w-0 relative', showRightPanel && 'border-r border-border')}
          >
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
                restoreVersion={restoreVersion}
              />
            )}

            {/* [New] Overlay if no problem is selected and not viewing other */}
            {!selectedProblemTitle && !isViewingOther && !isWhiteboardVisible && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  좌측 목록에서 문제를 선택해주세요
                </p>
              </div>
            )}
          </div>
          {/* Right Panel: Whiteboard OR Other's Code */}
          {showRightPanel && (
            <div className="flex-1 min-w-0">
              {isWhiteboardVisible ? (
                <WhiteboardPanel className="border-l-2 border-rose-400" />
              ) : (
                <IDEPanel
                  key={viewMode} // [Fix] Force remount when switching view modes to prevent stale content
                  editorId="other-editor"
                  readOnly
                  hideToolbar
                  initialCode={viewMode === 'SPLIT_SAVED' ? targetSubmission?.code : realtimeCode}
                  language={
                    viewMode === 'SPLIT_SAVED' ? targetSubmission?.language : realtimeLanguage
                  }
                  theme={theme} // Sync theme
                  borderColorClass={
                    viewMode === 'SPLIT_SAVED' ? 'border-indigo-400' : 'border-pink-400'
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <ControlBar
        onMicToggle={onMicToggle}
        onVideoToggle={onVideoToggle}
        onWhiteboardToggle={handleWhiteboardToggleWrapper}
        onSettingsClick={onSettingsClick}
      />
    </div>
  );
}
