'use client';

import { Track } from 'livekit-client';
import { VideoTrack, useParticipantTile } from '@livekit/components-react';
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
  const publication = participant.getTrackPublication(Track.Source.Camera);
  const isVideoEnabled = participant.isCameraEnabled && !!publication;
  const isAudioEnabled = participant.isMicrophoneEnabled;

  return (
    <div 
      className={cn(
        "relative aspect-video w-48 shrink-0 overflow-hidden rounded-lg border border-border bg-muted",
        "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
        isCurrentUser && "ring-2 ring-primary",
        className
      )} 
      onClick={onClick}
    >
      {isVideoEnabled ? (
        <VideoTrack 
          trackRef={{
            participant,
            source: Track.Source.Camera,
            publication: publication!,
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-900 text-muted-foreground">
           <User className="h-10 w-10" />
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-1 left-2 max-w-[80%]">
         <span className="truncate text-xs font-medium text-white shadow-sm drop-shadow-md">
           {participant.name || participant.identity} {isCurrentUser && "(나)"}
         </span>
      </div>

      {!isAudioEnabled && (
        <div className="absolute top-2 right-2 rounded-full bg-black/50 p-1">
          <MicOff className="h-3 w-3 text-red-500" />
        </div>
      )}
    </div>
  );
}
