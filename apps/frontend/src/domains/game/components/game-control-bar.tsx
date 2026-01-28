'use client';

import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Settings } from 'lucide-react';

interface GameControlBarProps {
  isMuted?: boolean;
  isVideoOff?: boolean;
  onMicToggle?: () => void;
  onVideoToggle?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function GameControlBar({
  isMuted = false,
  isVideoOff = false,
  onMicToggle,
  onVideoToggle,
  onSettingsClick,
  className,
}: GameControlBarProps) {
  // Internal state removed to sync with global state

  // Handlers directly call props

  const handleMicToggle = () => {
    onMicToggle?.();
  };

  const handleVideoToggle = () => {
    onVideoToggle?.();
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center border-t border-border bg-card px-4 py-3',
        className,
      )}
    >
      {/* Center Controls - Media */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleMicToggle}
          className={cn(
            'flex items-center justify-center h-12 w-12 rounded-full border transition-all duration-200 shadow-sm',
            isMuted
              ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
              : 'bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80',
          )}
          aria-label={isMuted ? '마이크 켜기' : '마이크 끄기'}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          onClick={handleVideoToggle}
          className={cn(
            'flex items-center justify-center h-12 w-12 rounded-full border transition-all duration-200 shadow-sm',
            isVideoOff
              ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
              : 'bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80',
          )}
          aria-label={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-secondary text-secondary-foreground border border-border/50 hover:bg-secondary/80 transition-all duration-200 shadow-sm"
          aria-label="설정"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
