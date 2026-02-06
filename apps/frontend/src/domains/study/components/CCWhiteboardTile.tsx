'use client';

import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface CCWhiteboardTileProps {
  onClick?: () => void;
  className?: string;
}

export function CCWhiteboardTile({ onClick, className }: CCWhiteboardTileProps) {
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const whiteboardOpenedBy = useRoomStore((state) => state.whiteboardOpenedBy);
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);

  const handleClick = () => {
    // Toggle whiteboard split view
    setWhiteboardOverlayOpen(!isWhiteboardOverlayOpen);
    onClick?.();
  };

  if (!isWhiteboardActive) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={cn(
        'relative flex h-40 w-52 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-rose-400 border border-transparent shadow-md',
        isWhiteboardOverlayOpen
          ? 'bg-gradient-to-br from-rose-400 to-rose-600 ring-2 ring-rose-500 dark:from-rose-500 dark:to-rose-700'
          : 'bg-gradient-to-br from-rose-50 to-rose-200 border-rose-200 dark:from-slate-800 dark:to-slate-700 dark:border-slate-600',
        className,
      )}
    >
      {/* Notification Banner */}

      {/* Whiteboard Preview Area */}
      <div className="flex flex-1 items-center justify-center">
        <Pencil className="h-8 w-8 text-rose-400 dark:text-rose-300" />
      </div>

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-center bg-white/90 px-2 py-1.5 border-t border-rose-100 shadow-inner dark:bg-slate-900/70 dark:border-slate-700">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-tight dark:text-rose-300">
          화이트보드
        </span>
      </div>
    </div>
  );
}
