'use client';

import { ReactNode, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

export interface StudyLayoutContentProps {
  header: ReactNode | null;
  leftPanel: ReactNode | null;
  centerPanel: ReactNode | null;
  rightPanel: ReactNode | null;
  isLeftPanelFolded: boolean;
  onUnfoldLeftPanel: () => void;
  isRightPanelFolded: boolean;
  onUnfoldRightPanel: () => void;
  className?: string;
}

export function StudyLayoutContent({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  isLeftPanelFolded,
  onUnfoldLeftPanel,
  isRightPanelFolded,
  onUnfoldRightPanel,
  className,
}: StudyLayoutContentProps) {
  const hasRightPanel = Boolean(rightPanel);
  const [leftWidth, setLeftWidth] = useState(288); // Default 288px (w-72)
  const [rightWidth, setRightWidth] = useState(320); // Default 320px (w-80)
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const startResizingLeft = useCallback(() => setIsResizingLeft(true), []);
  const startResizingRight = useCallback(() => setIsResizingRight(true), []);

  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizingLeft) {
        setLeftWidth(Math.max(200, Math.min(600, e.clientX)));
      }
      if (isResizingRight) {
        setRightWidth(Math.max(250, Math.min(600, window.innerWidth - e.clientX)));
      }
    },
    [isResizingLeft, isResizingRight],
  );

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingLeft, isResizingRight, resize, stopResizing]);

  return (
    <div className={cn('flex h-screen flex-col bg-background text-foreground', className)}>
      {/* Header */}
      {header && <header className="shrink-0 border-b border-border">{header}</header>}

      {/* Main Content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left Panel - Animation handled by width */}
        <aside
          style={{ width: isLeftPanelFolded ? 0 : leftWidth }}
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card',
            !isResizingLeft && 'transition-all duration-300 ease-in-out',
            isLeftPanelFolded && 'border-r-0',
          )}
        >
          <div style={{ width: leftWidth }} className="h-full">
            {/* Inner container to maintain width during transition */}
            {leftPanel}
          </div>
        </aside>

        {/* Left Resize Handle */}
        {!isLeftPanelFolded && (
          <div
            className="w-1 hover:w-1.5 -ml-0.5 z-20 cursor-col-resize bg-transparent hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
            onMouseDown={startResizingLeft}
          />
        )}

        {/* Center Panel */}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col transition-all duration-300',
            isLeftPanelFolded && 'pl-12',
            hasRightPanel && isRightPanelFolded && 'pr-12',
          )}
        >
          {/* Unfold Left Panel Button - Visible only when left folded */}
          {isLeftPanelFolded && (
            <div className="absolute left-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldLeftPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="문제 목록 펼치기"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Unfold Right Panel Button - Visible only when right folded */}
          {hasRightPanel && isRightPanelFolded && (
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldRightPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="채팅/참여자 펼치기"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {centerPanel}
        </main>

        {/* Right Resize Handle */}
        {hasRightPanel && !isRightPanelFolded && (
          <div
            className="w-1 hover:w-1.5 -mr-0.5 z-20 cursor-col-resize bg-transparent hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
            onMouseDown={startResizingRight}
          />
        )}

        {hasRightPanel && (
          <aside
            style={{ width: isRightPanelFolded ? 0 : rightWidth }}
            className={cn(
              'shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-card',
              !isResizingRight && 'transition-all duration-300 ease-in-out',
              isRightPanelFolded && 'border-l-0',
            )}
          >
            <div style={{ width: rightWidth }} className="h-full">{rightPanel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
