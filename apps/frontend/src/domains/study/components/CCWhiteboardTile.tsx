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

  if (!isWhiteboardActive) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={cn(
        'relative flex h-24 w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 transition-all hover:ring-2 hover:ring-rose-400',
        className,
      )}
    >
      {/* Notification Banner */}
      <div className="bg-rose-500 px-2 py-1 text-center text-xs font-medium text-white">
        두둥!!! 화이트보드가 활성화됩니다~!!
      </div>

      {/* Whiteboard Preview Area */}
      <div className="flex flex-1 items-center justify-center">
        <Pencil className="h-8 w-8 text-rose-400" />
      </div>

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-center bg-white/80 px-2 py-1">
        <span className="text-xs font-medium text-rose-600">
          {whiteboardOpenedBy
            ? `${whiteboardOpenedBy}님의 화이트보드`
            : '화이트보드'}
        </span>
      </div>
    </div>
  );
}
