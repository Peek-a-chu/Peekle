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
                'relative flex h-24 w-32 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-muted',
                'transition-all',
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-white text-lg font-medium shadow-sm">
                        {participant.name?.charAt(0) || participant.identity?.charAt(0) || <User className="h-6 w-6" />}
                    </div>
                </div>
            )}

            {/* Nickname */}
            <div className="absolute bottom-1 left-0 right-0 px-1">
                <div className="text-center">
                    <span className="text-xs font-medium text-white truncate drop-shadow-md">
                        {participant.name || participant.identity} {isCurrentUser && '(나)'}
                    </span>
                </div>
            </div>

            {/* Mic Off Indicator */}
            {!isAudioEnabled && (
                <div className="absolute top-1 right-1 rounded-full bg-red-500/80 p-0.5 shadow-sm">
                    <MicOff className="h-3 w-3 text-white" />
                </div>
            )}
        </div>
    );
}
