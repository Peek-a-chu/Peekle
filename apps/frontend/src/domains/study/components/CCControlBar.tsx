'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Pencil, Settings } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CCControlBarProps {
  onMicToggle?: () => void;
  onVideoToggle?: () => void;
  onWhiteboardToggle?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function CCControlBar({
  onMicToggle,
  onVideoToggle,
  onWhiteboardToggle,
  onSettingsClick,
  className,
}: CCControlBarProps) {
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const participants = useRoomStore((state) => state.participants);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const openSettingsModal = useSettingsStore((state) => state.openModal);

  // Derive state from Store
  const me = participants.find((p) => p.id === currentUserId);
  const isMuted = me?.isMuted ?? false;
  const isVideoOff = me?.isVideoOff ?? false;

  const handleMicToggle = () => {
    onMicToggle?.();
  };

  const handleVideoToggle = () => {
    onVideoToggle?.();
  };

  const handleSettingsClick = () => {
    openSettingsModal('device');
    // onSettingsClick은 호출하지 않음 - SettingsModal만 표시
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative flex items-center justify-center border-t border-border bg-card px-4 py-3',
          className,
        )}
      >
        {/* Center Controls - Media */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? 'destructive' : 'ghost'}
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95',
                  !isMuted && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  isMuted && 'bg-red-500 hover:bg-red-600 text-white',
                )}
                onClick={handleMicToggle}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" strokeWidth={2.25} />
                ) : (
                  <Mic className="h-6 w-6" strokeWidth={2.25} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isMuted ? '마이크 켜기' : '마이크 끄기'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoOff ? 'destructive' : 'ghost'}
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95',
                  !isVideoOff && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  isVideoOff && 'bg-red-500 hover:bg-red-600 text-white',
                )}
                onClick={handleVideoToggle}
              >
                {isVideoOff ? (
                  <VideoOff className="h-6 w-6" strokeWidth={2.25} />
                ) : (
                  <Video className="h-6 w-6" strokeWidth={2.25} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isVideoOff ? '카메라 켜기' : '비디오 끄기'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isWhiteboardActive ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95',
                  isWhiteboardActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
                onClick={onWhiteboardToggle}
              >
                <Pencil className="h-6 w-6" strokeWidth={2.25} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isWhiteboardActive ? '화이트보드 끄기' : '화이트보드 켜기'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95"
                onClick={handleSettingsClick}
              >
                <Settings className="h-5 w-5" strokeWidth={2.25} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>기기 설정</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
