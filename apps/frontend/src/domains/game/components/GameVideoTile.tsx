'use client';

import { Track } from 'livekit-client';
import { VideoTrack, useParticipantTracks } from '@livekit/components-react';
import { cn } from '@/lib/utils';
import { User, MicOff } from 'lucide-react';
import { Participant } from 'livekit-client';

interface GameVideoTileProps {
    participant: Participant;
    className?: string;
    isCurrentUser?: boolean;
}

export function GameVideoTile({ participant, className, isCurrentUser }: GameVideoTileProps) {
    // Use hook to track camera state reactively
    const videoTracks = useParticipantTracks([Track.Source.Camera], participant.identity);
    const videoTrackRef = videoTracks[0];

    const shouldShowVideo = !!videoTrackRef && !videoTrackRef.publication.isMuted;
    const isAudioEnabled = participant.isMicrophoneEnabled;

    return (
        <div
            className={cn(
                'relative h-40 w-52 shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
                'hover:ring-2 hover:ring-primary/50 transition-all',
                isCurrentUser && 'ring-2 ring-primary',
                className,
            )}
        >
            {shouldShowVideo ? (
                <VideoTrack
                    trackRef={videoTrackRef}
                    className={cn('h-full w-full object-cover scale-x-[-1]')}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-900 text-muted-foreground">
                    <User className="h-10 w-10" />
                </div>
            )}

            {/* Nickname - 스터디 룸처럼 좌측 하단 */}
            <div className="absolute bottom-1 left-2 max-w-[80%]">
                <span className="truncate text-xs font-medium text-white shadow-sm drop-shadow-md">
                    {participant.name || participant.identity} {isCurrentUser && '(나)'}
                </span>
            </div>

            {/* Mic Off Indicator - 스터디 룸처럼 더 크고 명확하게 */}
            {!isAudioEnabled && (
                <div className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 shadow-lg border border-red-600 animate-in fade-in zoom-in duration-300">
                    <MicOff className="h-4 w-4 text-white stroke-[2.5px]" />
                </div>
            )}
        </div>
    );
}
