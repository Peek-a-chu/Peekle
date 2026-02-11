'use client';

import { useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Loader2 } from 'lucide-react';

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
  initialCamEnabled = true,
}: CCLiveKitWrapperProps) {
  const token = useRoomStore((state) => state.videoToken);

  // Use env var for LiveKit URL, fallback to localhost.
  // For dev/docker, it's usually ws://localhost:7880 or wss://...
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  useEffect(() => {
    console.log('[CCLiveKitWrapper] Mounted. StudyId:', studyId, 'Token:', token ? 'Present' : 'Missing');
  }, [studyId, token]);

  return (
    <LiveKitRoom
      video={initialCamEnabled}
      audio={initialMicEnabled}
      token={token ?? undefined}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
    >
      {children}
      <RoomAudioRenderer />
      <MediaDeviceSynchronizer />
    </LiveKitRoom>
  );
}
