'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RightPanel } from '@/domains/study/components';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

interface BaseProps {
  className?: string;
}

const RIGHT_PANEL_MIN_WIDTH = 260;
const RIGHT_PANEL_MAX_WIDTH = 480;

export function StudyLayoutRightPanel({ className }: BaseProps) {
  const { foldRightPanel, isRightPanelFolded, rightPanelWidth, setRightPanelWidth } =
    useStudyStore();

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clampWidth = useCallback((width: number) => {
    return Math.max(RIGHT_PANEL_MIN_WIDTH, Math.min(RIGHT_PANEL_MAX_WIDTH, width));
  }, []);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isRightPanelFolded) return;
    dragStateRef.current = { startX: event.clientX, startWidth: rightPanelWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const nextWidth = clampWidth(
      dragStateRef.current.startWidth + (dragStateRef.current.startX - event.clientX),
    );
    setRightPanelWidth(nextWidth);
  };

  const handleResizeEnd = () => {
    dragStateRef.current = null;
  };

  return (
    <aside
      className={cn(
        'relative shrink-0 overflow-y-auto overflow-x-visible border-l border-border bg-card transition-all duration-300 ease-in-out',
        isRightPanelFolded ? 'w-0 border-l-0 overflow-hidden' : '',
        className,
      )}
      style={!isRightPanelFolded ? { width: rightPanelWidth } : undefined}
    >
      <div className="h-full" style={!isRightPanelFolded ? { width: rightPanelWidth } : undefined}>
        <RightPanel onFold={foldRightPanel} />
      </div>
      {!isRightPanelFolded && (
        <div
          role="separator"
          aria-orientation="vertical"
          className="absolute -left-1 top-0 z-30 h-full w-5 cursor-col-resize bg-border/20 hover:bg-border/70 active:bg-border select-none touch-none"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setRightPanelWidth(320)}
        />
      )}
    </aside>
  );
}
