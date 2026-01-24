'use client';

import { type ReactNode } from 'react';
import { useCenterPanel } from '@/domains/study/hooks/useCenterPanel';
import { CCVideoGrid as VideoGrid } from '@/domains/study/components/CCVideoGrid';
import { CCControlBar as ControlBar } from '@/domains/study/components/CCControlBar';
import { CCIDEPanel as IDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
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

  return (
    <div className={cn('flex h-full flex-col', className)}>
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
              onLanguageChange={setLanguage}
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
                language={language}
                theme={theme}
                hideToolbar // Pass this so it doesn't render double toolbar
              />
            )}
          </div>

          {/* Right IDE Panel (Other's Code - Read Only) */}
          {isViewingOther && (
            <div className="flex-1 min-w-0">
              <IDEPanel
                readOnly
                hideToolbar
                initialCode={viewMode === 'SPLIT_SAVED' ? targetSubmission?.code : undefined}
                theme={theme} // Sync theme
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
