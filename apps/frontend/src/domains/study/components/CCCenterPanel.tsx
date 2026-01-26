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
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';

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
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const socket = useSocket(roomId, currentUserId);

  // Track my latest code to respond to pull requests
  const myLatestCodeRef = useRef<string>('');
  const [restoredCode, setRestoredCode] = useState<string | null>(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const previousProblemIdRef = useRef<number | null>(null);

  // [Problem Selection] Save current code before switching, then request new problem's code
  useEffect(() => {
    if (!socket || !roomId || !selectedProblemId) return;

    // Skip if same problem
    if (previousProblemIdRef.current === selectedProblemId) return;

    // [IMPORTANT] 이전 문제가 있었다면, 전환 전에 현재 코드를 저장
    if (previousProblemIdRef.current !== null && myLatestCodeRef.current) {
      console.log(
        `[CCCenterPanel] Saving code for problem ${previousProblemIdRef.current} before switching`,
      );
      socket.emit('code-change', {
        roomId: String(roomId),
        code: myLatestCodeRef.current,
        problemId: previousProblemIdRef.current,
      });
      // 언어도 함께 저장
      socket.emit('language-change', {
        roomId: String(roomId),
        language: language,
        problemId: previousProblemIdRef.current,
      });
    }

    console.log(`[CCCenterPanel] Selecting problem ${selectedProblemId}`);
    socket.emit('select-problem', {
      roomId: String(roomId),
      problemId: selectedProblemId,
    });

    previousProblemIdRef.current = selectedProblemId;
  }, [socket, roomId, selectedProblemId, language]);

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
        // Send my language too
        socket.emit('language-change', {
          roomId: String(roomId),
          language: language,
        });
      }
    };

    socket.on('request-code', handleRequestCode);

    // [New] Restore my code if the server has it
    const handleCodeRestore = (data: {
      code: string | null;
      language?: string | null;
      problemId?: number;
    }) => {
      console.log('[CCCenterPanel] code-restore received:', data);

      // Increment version to ensure CCIDEPanel useEffect triggers even with same code
      setRestoreVersion((v) => v + 1);

      if (data.code) {
        // Restore saved code for this problem
        setRestoredCode(data.code);
        if (data.language) {
          console.log('Restoring language...', data.language);
          setLanguage(data.language);
        }
      } else {
        // No saved code - reset to default (signal with empty string triggers default in IDE)
        console.log('[CCCenterPanel] No saved code for problem, using default');
        setRestoredCode(''); // Empty string signals IDE to use default
      }
    };
    socket.on('code-restore', handleCodeRestore);

    return () => {
      socket.off('request-code', handleRequestCode);
      socket.off('code-restore', handleCodeRestore);
    };
  }, [socket, currentUserId, roomId, language, setLanguage]);

  const handleCodeChange = (code: string): void => {
    myLatestCodeRef.current = code;
    if (socket && roomId && selectedProblemId) {
      socket.emit('code-change', { roomId: String(roomId), code, problemId: selectedProblemId });
    }
  };

  const handleLanguageChange = (lang: string): void => {
    setLanguage(lang);
    if (socket && roomId && selectedProblemId) {
      console.log('Emitting language-change:', lang);
      socket.emit('language-change', {
        roomId: String(roomId),
        language: lang,
        problemId: selectedProblemId,
      });
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
                const currentSelectedProblemTitle = useRoomStore.getState().selectedProblemTitle;

                if (isViewingOther) {
                  // Smart Ref Chat: Capture other's code
                  const code = viewMode === 'SPLIT_SAVED' ? targetSubmission?.code : realtimeCode;
                  const lang =
                    viewMode === 'SPLIT_SAVED' ? targetSubmission?.language : realtimeLanguage;

                  // For bots, we want to include (Bot) and for saved submissions, indicate it's stored code
                  let ownerName =
                    viewMode === 'SPLIT_SAVED' ? targetSubmission?.username : viewingUser?.nickname;
                  if (viewMode === 'SPLIT_SAVED' && targetSubmission) {
                    const isBot =
                      targetSubmission.username === 'PS러버' ||
                      targetSubmission.username === 'CodeNinja';
                    ownerName = `${targetSubmission.username}${isBot ? ' (Bot)' : ''}의 저장된 코드`;
                  }

                  if (code) {
                    useRoomStore.getState().setPendingCodeShare({
                      code,
                      language: lang || 'python', // Fallback or infer
                      ownerName: ownerName || 'Unknown',
                      problemTitle: currentSelectedProblemTitle || 'Unknown Problem',
                      isRealtime: viewMode === 'SPLIT_REALTIME',
                    });
                    useRoomStore.getState().setRightPanelActiveTab('chat');
                    setTimeout(() => {
                      const chatInput = document.getElementById('chat-input');
                      if (chatInput) chatInput.focus();
                    }, 0);
                  }
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
            className={cn('flex-1 min-w-0 relative', isViewingOther && 'border-r border-border')}
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
            {!selectedProblemTitle && !isViewingOther && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  좌측 목록에서 문제를 선택해주세요
                </p>
              </div>
            )}
          </div>

          {/* Right IDE Panel (Other's Code - Read Only) */}
          {isViewingOther && (
            <div className="flex-1 min-w-0">
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
