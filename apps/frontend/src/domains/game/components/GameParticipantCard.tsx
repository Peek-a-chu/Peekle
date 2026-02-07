'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    MoreVertical,
    MicOff,
    VideoOff,
    Crown,
    Ban,
    UserCircle,
    FileCode2,
} from 'lucide-react';
import { useParticipants, useParticipantTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { UserIcon } from '@/components/UserIcon';
import type { GamePlayParticipant } from '@/domains/game/types/game-types';

interface GameParticipantCardProps {
    participant: GamePlayParticipant;
    isMe: boolean;
    isRoomOwner: boolean;
    isOnline: boolean; // Passed from parent based on connection
    micState: boolean;
    camState: boolean;
    onKick?: (p: GamePlayParticipant) => void;
    onDelegate?: (p: GamePlayParticipant) => void;
    onViewCode?: (p: GamePlayParticipant) => void;
    onMuteUser?: (p: GamePlayParticipant) => void;
    onVideoOffUser?: (p: GamePlayParticipant) => void;
    onViewProfile?: (p: GamePlayParticipant) => void; // Optional if needed
}

export function GameParticipantCard({
    participant,
    isMe,
    isRoomOwner,
    isOnline,
    micState,
    camState,
    onKick,
    onDelegate,
    onViewCode,
    onMuteUser,
    onVideoOffUser,
    onViewProfile,
}: GameParticipantCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // LiveKit Logic
    const liveKitParticipants = useParticipants();
    const liveKitParticipant = liveKitParticipants.find(
        (p) => p.identity === String(participant.id) || p.identity.startsWith(`${participant.id}_`)
    );

    const videoTracks = useParticipantTracks(
        [Track.Source.Camera],
        liveKitParticipant?.identity
    );
    const videoTrack = videoTracks[0];
    const isVideoEnabled = !!videoTrack && !videoTrack.publication.isMuted && !videoTrack.participant.isCameraEnabled === false;
    // Note: isCameraEnabled property on participant might differ from track mute status slightly, checking track correctness.
    const shouldShowVideo = !!videoTrack && !videoTrack.publication.isMuted;

    // Audio Track
    const audioTracks = useParticipantTracks(
        [Track.Source.Microphone],
        liveKitParticipant?.identity
    );
    const audioTrack = audioTracks[0];
    const isAudioEnabled = !!audioTrack && !audioTrack.publication.isMuted;

    // Actions Availability
    // 1. Owner Actions (on Others)
    const canOwnerActions = isRoomOwner && !isMe;
    // 2. View Code (Online Only, Not Me)
    const canViewCode = isOnline && !isMe;
    // 3. View Profile (Everyone except me - if implemented)
    const canViewProfile = !isMe && !!onViewProfile;

    const hasAnyAction = canOwnerActions || canViewCode || canViewProfile;

    return (
        <div
            className={cn(
                'group relative flex items-center justify-between rounded-xl border p-3 shadow-sm transition-all duration-200',
                isOnline
                    ? 'bg-card border-border hover:border-primary/50 hover:shadow-md hover:bg-accent/5'
                    : 'bg-muted/10 border-transparent opacity-50 grayscale',
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                {/* Profile & Status */}
                <div className="relative shrink-0">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/50 bg-muted">
                        <UserIcon
                            src={participant.profileImg}
                            nickname={participant.nickname}
                            size={40}
                            className="w-full h-full"
                        />
                    </div>

                    {/* Status Dot */}
                    <div
                        className={cn(
                            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ring-1 ring-background',
                            isOnline ? 'bg-green-500' : 'bg-slate-400',
                        )}
                        title={isOnline ? '온라인' : '오프라인'}
                    />
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={cn(
                                'truncate font-bold text-sm',
                                isMe ? 'text-foreground' : 'text-foreground/90',
                            )}
                        >
                            {participant.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-muted-foreground font-medium">(나)</span>}
                        {participant.isHost && <span title="방장">👑</span>}
                    </div>
                    {/* Team Badge could go here if needed */}
                    {participant.team && (
                        <span className={cn(
                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm w-fit mt-0.5",
                            participant.team === 'RED' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                            {participant.team} TEAM
                        </span>
                    )}
                </div>
            </div>

            {/* Status Icons & Menu */}
            <div className="flex items-center gap-1.5">
                {/* Status Icons (Online only) */}
                {isOnline && (
                    <div className="flex items-center gap-1 mr-1">
                        {!isAudioEnabled && <MicOff className="h-3.5 w-3.5 text-red-500 stroke-[2.5px]" />}
                        {!shouldShowVideo && <VideoOff className="h-3.5 w-3.5 text-red-500 stroke-[2.5px]" />}
                    </div>
                )}

                {/* Menu Trigger */}
                <div className="relative flex items-center h-8 w-8 justify-center" ref={menuRef}>
                    {hasAnyAction && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                aria-label="메뉴"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95">
                                    <div className="flex flex-col py-1">
                                        {/* Owner Actions */}
                                        {canOwnerActions && (
                                            <>
                                                <button
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                                                    onClick={() => onMuteUser?.(participant)}
                                                >
                                                    <MicOff className="h-3.5 w-3.5" />
                                                    마이크 끄기
                                                </button>
                                                <button
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                                                    onClick={() => onVideoOffUser?.(participant)}
                                                >
                                                    <VideoOff className="h-3.5 w-3.5" />
                                                    카메라 끄기
                                                </button>
                                            </>
                                        )}

                                        {/* View Code */}
                                        {canViewCode && (
                                            <button
                                                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                                                onClick={() => onViewCode?.(participant)}
                                            >
                                                <FileCode2 className="h-3.5 w-3.5 text-blue-500" />
                                                실시간 코드 보기
                                            </button>
                                        )}

                                        {/* Critical Actions */}
                                        {canOwnerActions && (
                                            <>
                                                <div className="my-1 h-px bg-border" />
                                                <button
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                                                    onClick={() => onDelegate?.(participant)}
                                                >
                                                    <Crown className="h-3.5 w-3.5 text-yellow-600" />
                                                    방장 넘기기
                                                </button>
                                                <button
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-red-500 hover:text-red-600 text-left"
                                                    onClick={() => onKick?.(participant)}
                                                >
                                                    <Ban className="h-3.5 w-3.5" />
                                                    강퇴하기
                                                </button>
                                            </>
                                        )}

                                        {/* Profile */}
                                        {canViewProfile && (
                                            <>
                                                <div className="my-1 h-px bg-border" />
                                                <button
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                                                    onClick={() => onViewProfile?.(participant)}
                                                >
                                                    <UserCircle className="h-3.5 w-3.5" />
                                                    프로필 보기
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
