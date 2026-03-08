'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { type ReactNode } from 'react';
import { useCenterPanel } from '@/domains/study/hooks/useCenterPanel';
import { CCVideoGrid as VideoGrid } from '@/domains/study/components/CCVideoGrid';
import { CCControlBar as ControlBar } from '@/domains/study/components/CCControlBar';
import { CCIDEPanel as IDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { CCConsolePanel } from '@/domains/study/components/CCConsolePanel';
import { useExecution } from '@/domains/study/hooks/useExecution';
import { WhiteboardPanel } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useRealtimeCode } from '@/domains/study/hooks/useRealtimeCode';
import { useSocket } from '@/domains/study/hooks/useSocket';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { apiFetch } from '@/lib/api';
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
  const getTemplateCode = (languageValue: string): string => {
    const normalized = languageValue.toLowerCase();

    if (normalized.includes('java') && !normalized.includes('script')) {
      return `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // 코드를 작성해주세요
        System.out.println("Hello World!");
    }
}`;
    }

    if (normalized.includes('cpp') || normalized.includes('c++')) {
      return `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    // 코드를 작성해주세요
    cout << "Hello World!" << endl;
    return 0;
}`;
    }

    return `import sys

# 코드를 작성해주세요
print("Hello World!")`;
  };

  const normalizeLanguage = (languageValue: string): string => {
    const normalized = languageValue.toLowerCase();
    if (normalized.includes('java') && !normalized.includes('script')) return 'java';
    if (normalized.includes('cpp') || normalized.includes('c++')) return 'cpp';
    return 'python';
  };

  const getLanguageBadgeLabel = (languageValue: string): string => {
    const normalized = normalizeLanguage(languageValue);
    if (normalized === 'cpp') return 'C++';
    if (normalized === 'java') return 'Java';
    return 'Python';
  };

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

  const { isExecuting, executionResult, executeCode } = useExecution();

  const {
    code: realtimeCode,
    language: realtimeLanguage,
    problemTitle: realtimeProblemTitle,
    problemExternalId: realtimeProblemExternalId,
  } = useRealtimeCode(
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

  // Video Grid Resize State
  const [videoGridHeight, setVideoGridHeight] = useState(240);
  const [isResizingVideo, setIsResizingVideo] = useState(false);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // Console Panel State
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(250);
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  const consoleResizeStartY = useRef<number>(0);
  const consoleResizeStartHeight = useRef<number>(0);

  // Font Size State
  const [fontSize, setFontSize] = useState<number>(14);

  // Load font size from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ide-font-size');
      if (saved) {
        setFontSize(parseInt(saved, 10));
      }
    }
  }, []);

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    localStorage.setItem('ide-font-size', newSize.toString());
  };

  const startResizingVideo = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingVideo(true);
      resizeStartY.current = e.clientY;
      resizeStartHeight.current = videoGridHeight;
    },
    [videoGridHeight],
  );

  useEffect(() => {
    if (!isResizingVideo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY.current;
      setVideoGridHeight(Math.max(100, Math.min(600, resizeStartHeight.current + deltaY)));
    };

    const handleMouseUp = () => {
      setIsResizingVideo(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingVideo]);

  const startResizingConsole = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingConsole(true);
      consoleResizeStartY.current = e.clientY;
      consoleResizeStartHeight.current = consoleHeight;
    },
    [consoleHeight],
  );

  useEffect(() => {
    if (!isResizingConsole) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = consoleResizeStartY.current - e.clientY;
      setConsoleHeight(Math.max(100, Math.min(600, consoleResizeStartHeight.current + deltaY)));
    };

    const handleMouseUp = () => {
      setIsResizingConsole(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingConsole]);


  // [Fix] Whiteboard is only visible when a problem is selected
  const isWhiteboardVisible = isWhiteboardOverlayOpen && !!selectedProblemTitle;

  // Show right panel when viewing other's code OR whiteboard is open
  const showRightPanel = isViewingOther || isWhiteboardVisible;
  const myProblemLabel = selectedProblemTitle
    ? `${selectedProblemExternalId ? `[${selectedProblemExternalId}] ` : ''}${selectedProblemTitle}`
    : '문제 선택 중';
  const savedCodeOwner = (targetSubmission?.username || '').trim();
  const savedCodeLanguageLabel = targetSubmission?.language
    ? getLanguageBadgeLabel(targetSubmission.language)
    : '';
  const savedCodeMetaLabel = [savedCodeOwner, savedCodeLanguageLabel]
    .filter((value) => value.length > 0)
    .join(' · ');
  const savedCodePanelLabel = savedCodeMetaLabel
    ? `저장 코드 (${savedCodeMetaLabel})`
    : '저장 코드 문제';
  const otherProblemLabel =
    viewMode === 'SPLIT_SAVED'
      ? targetSubmission?.problemTitle || '저장된 코드'
      : (() => {
        const title = (realtimeProblemTitle || '').trim();
        if (!title) return '문제 선택 중';
        const externalPrefix = realtimeProblemExternalId
          ? `[${realtimeProblemExternalId}] `
          : '';
        const languageSuffix = realtimeLanguage
          ? ` (${getLanguageBadgeLabel(realtimeLanguage)})`
          : '';
        return `${externalPrefix}${title}${languageSuffix}`;
      })();

  // Track my latest code to respond to pull requests
  const myLatestCodeRef = useRef<string>('');
  const [restoredCode, setRestoredCode] = useState<string | null>(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [isHydratingDraft, setIsHydratingDraft] = useState(false);
  const restorePublishPayloadRef = useRef<{
    problemId: number;
    code: string;
    language: string;
  } | null>(null);
  const hydratedProblemKeyRef = useRef<string | null>(null);
  const restoreRequestSeqRef = useRef(0);
  const lastRestoredLanguageRef = useRef<string>('python');
  const previousSelectionRef = useRef<{ studyProblemId: number | null; language: string }>({
    studyProblemId: null,
    language: 'python',
  });
  const ideEventTsRef = useRef(0);

  const nextIdeEventTs = () => {
    const now = Date.now();
    if (now <= ideEventTsRef.current) {
      ideEventTsRef.current += 1;
    } else {
      ideEventTsRef.current = now;
    }
    return ideEventTsRef.current;
  };

  const publishIdeUpdate = (
    codeValue: string,
    languageValue: string,
    problemIdValue?: number | null,
    eventTsValue?: number,
  ) => {
    const targetProblemId = problemIdValue ?? selectedStudyProblemId;
    if (!socket || !roomId || !targetProblemId) return;
    const eventTs = eventTsValue ?? nextIdeEventTs();

    socket.publish({
      destination: '/pub/ide/update',
      body: JSON.stringify({
        problemId: targetProblemId,
        problemTitle: selectedProblemTitle,
        externalId: selectedProblemExternalId,
        code: codeValue,
        lang: languageValue,
        language: languageValue,
        eventTs,
      }),
    });
  };

  // [Problem Selection] Save current code before switching, then request new problem's code
  const handleCodeChange = (code: string, languageOverride?: string): void => {
    myLatestCodeRef.current = code;
    const targetLanguage = languageOverride || language;

    publishIdeUpdate(code, targetLanguage);
  };

  // Provide IDE code to external components (like Testcase Runner Modal) via custom events
  useEffect(() => {
    const handleRequestCode = () => {
      let currentCode = leftPanelRef.current?.getValue();
      if (!currentCode) currentCode = myLatestCodeRef.current;

      window.dispatchEvent(new CustomEvent('receive-ide-code', {
        detail: {
          code: currentCode || '',
          language: language
        }
      }));
    };

    window.addEventListener('request-ide-code', handleRequestCode);
    return () => window.removeEventListener('request-ide-code', handleRequestCode);
  }, [language, leftPanelRef]);

  const handleLanguageChange = (lang: string, switchedCode?: string): void => {
    setLanguage(lang);
    const templateCode = switchedCode ?? getTemplateCode(lang);
    myLatestCodeRef.current = templateCode;
    if (socket && roomId && selectedStudyProblemId) {
      const eventTs = nextIdeEventTs();
      socket.publish({
        destination: '/pub/ide/language',
        body: JSON.stringify({
          problemId: selectedStudyProblemId,
          problemTitle: selectedProblemTitle,
          externalId: selectedProblemExternalId,
          code: templateCode,
          lang,
          language: lang,
          eventTs,
        }),
      });
    }
  };

  const handleExecuteWrapper = useCallback((input: string) => {
    // 1. Try to get actively from Editor Ref (safest and most current)
    // 2. Fallback to myLatestCodeRef
    let currentCode = leftPanelRef.current?.getValue();
    if (!currentCode) currentCode = myLatestCodeRef.current;

    if (!currentCode || !currentCode.trim()) {
      toast.error('실행할 코드가 없습니다. 코드를 먼저 작성해주세요.');
      return;
    }
    executeCode({
      language,
      code: currentCode,
      input
    });
    setIsConsoleOpen(true);
  }, [language, executeCode, leftPanelRef]);

  const handleWhiteboardToggleWrapper = () => {
    if (!selectedProblemTitle) {
      toast.error('문제를 먼저 선택해주세요.');
      return;
    }
    onWhiteboardToggle?.();
  };

  useEffect(() => {
    if (!roomId) {
      previousSelectionRef.current = { studyProblemId: selectedStudyProblemId, language };
      return;
    }

    const previousProblemId = previousSelectionRef.current.studyProblemId;
    const previousLanguage = previousSelectionRef.current.language;

    if (previousProblemId && previousProblemId !== selectedStudyProblemId) {
      const latestCode = leftPanelRef.current?.getValue() || myLatestCodeRef.current || '';
      void apiFetch(`/api/studies/${roomId}/problems/${previousProblemId}/draft`, {
        method: 'POST',
        body: JSON.stringify({
          code: latestCode,
          language: previousLanguage,
        }),
      });
    }

    previousSelectionRef.current = { studyProblemId: selectedStudyProblemId, language };
  }, [roomId, selectedStudyProblemId, language, leftPanelRef]);

  useEffect(() => {
    if (!roomId || !selectedStudyProblemId) {
      hydratedProblemKeyRef.current = null;
      setIsHydratingDraft(false);
      return;
    }

    const problemKey = `${roomId}:${selectedStudyProblemId}`;
    hydratedProblemKeyRef.current = problemKey;
    const requestSeq = ++restoreRequestSeqRef.current;
    setIsHydratingDraft(true);

    const isLatestRequest = () => restoreRequestSeqRef.current === requestSeq;

    const applyCode = (nextCode: string, storageLanguage: string) => {
      if (!isLatestRequest()) return;

      const normalizedStorageLanguage = normalizeLanguage(storageLanguage);
      myLatestCodeRef.current = nextCode;
      lastRestoredLanguageRef.current = normalizedStorageLanguage;
      restorePublishPayloadRef.current = {
        problemId: selectedStudyProblemId,
        code: nextCode,
        language: normalizedStorageLanguage,
      };
      setRestoredCode(nextCode);
      setRestoreVersion((prev) => prev + 1);

      if (normalizeLanguage(language) !== normalizedStorageLanguage) {
        // Keep editor language and restored draft language in sync without
        // showing an intermediate template state.
        setLanguage(normalizedStorageLanguage);
      }
    };

    const seedTemplateCode = () => {
      const defaultLanguage = 'python';
      const templateCode = getTemplateCode(defaultLanguage);
      applyCode(templateCode, defaultLanguage);
    };

    const finishHydration = () => {
      if (!isLatestRequest()) return;
      window.requestAnimationFrame(() => {
        if (!isLatestRequest()) return;
        setIsHydratingDraft(false);
      });
    };

    const hydrateDraft = async () => {
      try {
        const response = await apiFetch<{ code?: string; language?: string }>(
          `/api/studies/${roomId}/problems/${selectedStudyProblemId}/draft`,
        );

        if (!isLatestRequest()) return;

        const draftCode = response.data?.code;
        const draftLanguage = response.data?.language
          ? normalizeLanguage(response.data.language)
          : 'python';

        if (response.success && typeof draftCode === 'string') {
          applyCode(draftCode, draftLanguage);
          finishHydration();
          return;
        }
      } catch {
        // Ignore draft fetch failures and fall back to template code
      }

      seedTemplateCode();
      finishHydration();
    };

    void hydrateDraft();
  }, [roomId, selectedStudyProblemId, setLanguage]);

  useEffect(() => {
    if (!socket || !roomId || !selectedStudyProblemId) return;
    if (restoreVersion <= 0) return;

    const payload = restorePublishPayloadRef.current;
    if (!payload) return;
    if (payload.problemId !== selectedStudyProblemId) return;

    publishIdeUpdate(payload.code, payload.language, selectedStudyProblemId);
  }, [socket, roomId, selectedStudyProblemId, restoreVersion]);

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
      {!isVideoGridFolded && (
        <>
          <div style={{ height: videoGridHeight }} className="shrink-0 relative transition-none">
            <VideoGrid onWhiteboardClick={onWhiteboardClick} className="h-full" />
          </div>
          {/* Resize Handle */}
          <div
            className="h-1 cursor-row-resize bg-border/50 hover:bg-primary/50 active:bg-primary transition-colors shrink-0 z-10"
            onMouseDown={startResizingVideo}
          />
        </>
      )}

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
              fontSize={fontSize}
              // Conditional Props based on View Mode
              viewingUser={isViewingOther ? viewingUser : null}
              viewMode={viewMode}
              targetSubmission={targetSubmission}
              onResetView={resetToOnlyMine}
              disabled={!selectedProblemTitle && !isViewingOther}
              problemExternalId={selectedProblemExternalId}
              currentProblemLabel={selectedProblemTitle}
              // Standard Handlers
              onLanguageChange={(lang) => leftPanelRef.current?.setLanguage(lang)}
              onThemeToggle={handleThemeToggle}
              onFontSizeChange={handleFontSizeChange}
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
              // New Props for Execute
              showExecute={!isViewingOther}
              isExecuting={isExecuting}
              onToggleConsole={() => setIsConsoleOpen((prev) => !prev)}
              onExecute={() => {
                if (!isConsoleOpen) setIsConsoleOpen(true);
                // Console is now always mounted, so we can dispatch immediately
                window.dispatchEvent(new CustomEvent('study-ide-execute-trigger'));
              }}
              // Toggles
              showSubmit={!isViewingOther}
              showChatRef={true}
              showThemeToggle={true}
            />
          </div>
        </div>

        {/* Editor Body Row */}
        <div className="flex min-h-0 flex-1 min-w-0 relative flex-col">
          <div className="flex min-h-0 flex-1 min-w-0 relative">
            {/* Left IDE Panel (My Code) */}
            <div
              className={cn(
                'flex flex-1 min-w-0 flex-col',
                showRightPanel && 'border-r border-border',
              )}
            >
              <div className="h-8 shrink-0 border-b border-border bg-muted/35 px-3 text-xs text-muted-foreground">
                <div className="flex h-full items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="shrink-0">내 문제</span>
                  <span className="truncate text-foreground/90" title={myProblemLabel}>
                    {myProblemLabel}
                  </span>
                </div>
              </div>
              <div className="relative min-h-0 flex-1">
                {ideContent ?? (
                  <IDEPanel
                    ref={leftPanelRef}
                    editorId="my-editor"
                    language={language}
                    onLanguageChange={handleLanguageChange}
                    theme={theme}
                    fontSize={fontSize}
                    hideToolbar // Pass this so it doesn't render double toolbar
                    onFontSizeChange={handleFontSizeChange}
                    onCodeChange={handleCodeChange}
                    restoredCode={restoredCode}
                    restoreVersion={restoreVersion}
                  />
                )}

                {isHydratingDraft && !!selectedStudyProblemId && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <p className="text-sm font-medium text-muted-foreground">Loading problem...</p>
                  </div>
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
            </div>
            {/* Right Panel: Whiteboard OR Other's Code */}
            {showRightPanel && (
              <div className="flex min-w-0 flex-1 flex-col">
                {isWhiteboardVisible ? (
                  <WhiteboardPanel className="border-l-2 border-rose-400" />
                ) : (
                  <>
                    <div className="h-8 shrink-0 border-b border-border bg-muted/35 px-3 text-xs text-muted-foreground">
                      <div className="flex h-full items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
                        <span className="shrink-0">
                          {viewMode === 'SPLIT_SAVED' ? savedCodePanelLabel : '상대 문제'}
                        </span>
                        <span className="truncate text-foreground/90" title={otherProblemLabel}>
                          {otherProblemLabel}
                        </span>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1">
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
                        fontSize={fontSize}
                        onFontSizeChange={handleFontSizeChange}
                        borderColorClass={
                          viewMode === 'SPLIT_SAVED' ? 'border-indigo-400' : 'border-pink-400'
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Console Overlay Drawer */}
          {!isViewingOther && (
            <div
              style={{ height: isConsoleOpen ? consoleHeight : 0, opacity: isConsoleOpen ? 1 : 0 }}
              className={cn(
                "absolute bottom-0 left-0 right-0 z-30 transition-[height,opacity] duration-300 ease-in-out border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] bg-background flex flex-col items-stretch justify-start",
                !isConsoleOpen && "pointer-events-none"
              )}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize bg-transparent hover:bg-primary/50 active:bg-primary z-40 transition-colors" onMouseDown={startResizingConsole} />

              <div className="flex-1 w-full min-h-0 relative h-full">
                <CCConsolePanel
                  roomId={roomId}
                  problemId={selectedStudyProblemId}
                  isOpen={isConsoleOpen} // Keep mounted, just manage visibility
                  onClose={() => setIsConsoleOpen(false)}
                  onExecute={handleExecuteWrapper}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                />
              </div>
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


