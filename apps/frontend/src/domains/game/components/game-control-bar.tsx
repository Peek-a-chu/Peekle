'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
                <Button
                    variant={isMuted ? 'destructive' : 'ghost'}
                    size="icon"
                    className={cn(
                        'h-12 w-12 rounded-full',
                        !isMuted && 'bg-[#EDF2F8] hover:bg-[#DFE7F0]',
                    )}
                    onClick={handleMicToggle}
                    aria-label={isMuted ? '마이크 켜기' : '마이크 끄기'}
                >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                    variant={isVideoOff ? 'destructive' : 'ghost'}
                    size="icon"
                    className={cn(
                        'h-12 w-12 rounded-full',
                        !isVideoOff && 'bg-[#EDF2F8] hover:bg-[#DFE7F0]',
                    )}
                    onClick={handleVideoToggle}
                    aria-label={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
                >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>

                {/* 화이트보드(Pencil) 제외됨 */}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-[#EDF2F8] hover:bg-[#DFE7F0]"
                    onClick={onSettingsClick}
                    aria-label="설정"
                >
                    <Settings className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
