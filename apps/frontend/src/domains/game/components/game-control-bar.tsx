'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalParticipant } from '@livekit/components-react';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

interface GameControlBarProps {
  onSettingsClick?: () => void;
  className?: string;
}

export function GameControlBar({
  onSettingsClick,
  className,
}: GameControlBarProps) {
  const openSettingsModal = useSettingsStore((state) => state.openModal);

  // Use LiveKit local participant state for immediate feedback
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const isMuted = !isMicrophoneEnabled;
  const isVideoOff = !isCameraEnabled;

  const handleMicToggle = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const handleVideoToggle = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  };

  const handleSettingsClick = () => {
    openSettingsModal('device');
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative flex h-14 items-center justify-center border-t border-border bg-card px-4',
          className,
        )}
      >
        {/* Center Controls - Media */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95',
                  isMuted
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
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
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95',
                  isVideoOff
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
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
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-muted text-muted-foreground hover:bg-muted/90 border border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95"
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
