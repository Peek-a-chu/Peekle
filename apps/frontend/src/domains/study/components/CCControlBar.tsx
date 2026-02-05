'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Pencil, Settings } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import { useLocalParticipant } from '@livekit/components-react';

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

  // Use LiveKit local participant state for immediate feedback
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const isMuted = !isMicrophoneEnabled;
  const isVideoOff = !isCameraEnabled;

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
        'relative flex items-center justify-center border-t border-border bg-card px-4 py-2',
        className,
      )}
      data-tour="control-bar"
    >
      {/* Center Controls - Media */}
      <div className="flex items-center gap-4">
        {/* Mic Control */}
        <Button
          variant={isMuted ? 'destructive' : 'default'}
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full transition-colors',
            isVideoOff
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
          onClick={handleMicToggle}
          aria-label={isMuted ? '마이크 켜기' : '마이크 끄기'}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {/* Video Control */}
        <Button
          variant="default"
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full transition-colors',
            isVideoOff
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
          onClick={handleVideoToggle}
          aria-label={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        {/* Whiteboard Control */}
        <Button
          variant={isWhiteboardActive ? 'default' : 'ghost'}
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full transition-colors',
            isWhiteboardActive
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          )}
          onClick={onWhiteboardToggle}
          aria-label={isWhiteboardActive ? '화이트보드 끄기' : '화이트보드 켜기'}
        >
          <Pencil className="h-6 w-6" />
        </Button>

        {/* Settings Control */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full transition-colors',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          )}
          onClick={handleSettingsClick}
          aria-label="설정"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
