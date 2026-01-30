'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Pencil, Settings } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

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
    <div
      className={cn(
        'relative flex items-center justify-center border-t border-border bg-card px-4 py-3',
        className,
      )}
    >
      {/* Center Controls - Media */}
      <div className="flex items-center gap-4">
        <Button
          variant={isMuted ? 'destructive' : 'ghost'}
          size="icon"
          className={cn('h-12 w-12 rounded-full', !isMuted && 'bg-[#EDF2F8] hover:bg-[#DFE7F0]')}
          onClick={handleMicToggle}
          aria-label={isMuted ? '마이크 켜기' : '마이크 끄기'}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          variant={isVideoOff ? 'destructive' : 'ghost'}
          size="icon"
          className={cn('h-12 w-12 rounded-full', !isVideoOff && 'bg-[#EDF2F8] hover:bg-[#DFE7F0]')}
          onClick={handleVideoToggle}
          aria-label={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        <Button
          variant={isWhiteboardActive ? 'default' : 'ghost'}
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full',
            isWhiteboardActive
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : 'bg-[#EDF2F8] hover:bg-[#DFE7F0]',
          )}
          onClick={onWhiteboardToggle}
          aria-label={isWhiteboardActive ? '화이트보드 끄기' : '화이트보드 켜기'}
        >
          <Pencil className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-[#EDF2F8] hover:bg-[#DFE7F0]"
          onClick={handleSettingsClick}
          aria-label="설정"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
