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
        'relative flex h-24 w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-rose-400',
        isWhiteboardOverlayOpen
          ? 'bg-gradient-to-br from-rose-300 to-rose-400 ring-2 ring-rose-500'
          : 'bg-gradient-to-br from-rose-100 to-rose-200',
        className,
      )}
    >
      {/* Notification Banner */}

      {/* Whiteboard Preview Area */}
      <div className="flex flex-1 items-center justify-center">
        <Pencil className="h-8 w-8 text-rose-400" />
      </div>

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-center bg-white/80 px-2 py-1">
        <span className="text-xs font-medium text-rose-600">
          {/* {whiteboardOpenedBy ? `${whiteboardOpenedBy}님의 화이트보드` : '화이트보드'} */}
          화이트보드
        </span>
      </div>
    </div>
  );
}
