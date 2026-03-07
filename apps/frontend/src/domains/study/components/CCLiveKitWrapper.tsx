'use client';

import React, { useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import '@livekit/components-styles';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { MediaDeviceSynchronizer } from '@/components/common/MediaDeviceSynchronizer';

interface CCLiveKitWrapperProps {
  studyId: number;
  children: React.ReactNode;
  initialMicEnabled?: boolean;
  initialCamEnabled?: boolean;
}

export function CCLiveKitWrapper({
  studyId,
  children,
  initialMicEnabled = false,
  initialCamEnabled = false,
}: CCLiveKitWrapperProps) {
  const token = useRoomStore((state) => state.videoToken);
  const requestVideoToken = useStudySocketActions().requestVideoToken;
  const retryStateRef = React.useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  // Use env var for LiveKit URL, fallback to localhost.
  // For dev/docker, it's usually ws://localhost:7880 or wss://...
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  useEffect(() => {
    console.log('[CCLiveKitWrapper] Mounted. StudyId:', studyId, 'Token:', token ? 'Present' : 'Missing');
  }, [studyId, token]);

  const requestTokenWithBackoff = React.useCallback(() => {
    const now = Date.now();
    const elapsed = now - retryStateRef.current.lastAt;

    if (elapsed < 1500) {
      return;
    }

    retryStateRef.current.lastAt = now;
    retryStateRef.current.count += 1;

    requestVideoToken();

    if (retryStateRef.current.count >= 3) {
      toast.warning('화상 연결이 불안정합니다. 잠시 후 다시 연결을 시도합니다.');
    }
  }, [requestVideoToken]);

  useEffect(() => {
    retryStateRef.current = { count: 0, lastAt: 0 };
  }, [token]);

  return (
    <LiveKitRoom
      video={initialCamEnabled}
      audio={initialMicEnabled}
      token={token ?? undefined}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
      options={{
        videoCaptureDefaults: {
          resolution: VideoPresets.h360.resolution,
        },
        publishDefaults: {
          videoEncoding: VideoPresets.h360.encoding,
        },
      }}
      onDisconnected={() => {
        requestTokenWithBackoff();
      }}
      onError={() => {
        requestTokenWithBackoff();
      }}
    >
      {children}
      <RoomAudioRenderer />
      <MediaDeviceSynchronizer />
    </LiveKitRoom>
  );
}
