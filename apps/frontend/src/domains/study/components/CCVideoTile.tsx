'use client';

import { Track } from 'livekit-client';
import { VideoTrack, useParticipantTracks } from '@livekit/components-react';
import { cn } from '@/lib/utils';
import { User, MicOff } from 'lucide-react';
import { Participant } from 'livekit-client';

interface CCVideoTileProps {
  participant: Participant;
  className?: string;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

export function CCVideoTile({ participant, className, onClick, isCurrentUser }: CCVideoTileProps) {
  // Use hook to track camera state reactively
  const videoTracks = useParticipantTracks([Track.Source.Camera], participant.identity);
  const videoTrackRef = videoTracks[0]; // Requesting only Camera, so first one is it

  const isVideoEnabled =
    !!videoTrackRef &&
    videoTrackRef.participant.isCameraEnabled &&
    !videoTrackRef.publication.isMuted;
  const isAudioEnabled = participant.isMicrophoneEnabled;

  // Additional check for local participant: sometimes isCameraEnabled is true but track is not yet published in the list?
  // But useParticipantTracks should handle that.
  // Note: participant.isCameraEnabled might update faster?
  // Let's rely on track existence for rendering VideoTrack.
  // Also check publication directly for logic if needed, but hook drives re-render.

  // Re-deriving enabled state for consistent rendering
  const shouldShowVideo = !!videoTrackRef && !videoTrackRef.publication.isMuted;

  return (
    <div
      className={cn(
        'relative h-40 w-52 shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
        'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
        isCurrentUser && 'ring-2 ring-primary',
        className,
      )}
      onClick={onClick}
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

      {/* Overlays */}
      <div className="absolute bottom-2 left-2 max-w-[85%]">
        <div className="rounded-md bg-black/60 px-2 py-0.5 backdrop-blur-sm border border-white/10 shadow-lg">
          <span className="truncate text-xs font-bold text-white">
            {participant.name || participant.identity} {isCurrentUser && '(나)'}
          </span>
        </div>
      </div>

      {!isAudioEnabled && (
        <div className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 shadow-lg border border-red-600 animate-in fade-in zoom-in duration-300">
          <MicOff className="h-4 w-4 text-white stroke-[2.5px]" />
        </div>
      )}
    </div>
  );
}
