'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuthStore } from '@/store/auth-store';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Loader2 } from 'lucide-react';

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
  // const [token, setToken] = useState<string>(''); // Managed in store now
  const user = useAuthStore((state) => state.user);
  const token = useRoomStore((state) => state.videoToken);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const permissionStreamRef = useRef<MediaStream | null>(null);

  // Use env var for LiveKit URL, fallback to localhost.
  // For dev/docker, it's usually ws://localhost:7880 or wss://...
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  useEffect(() => {
    console.log('[CCLiveKitWrapper] Mounted. StudyId:', studyId, 'Token:', token ? 'Present' : 'Missing');
    
    const checkPermissions = async () => {
      try {
        console.log('[CCLiveKitWrapper] Requesting media permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        permissionStreamRef.current = stream;
        setPermissionsGranted(true);
        console.log('[CCLiveKitWrapper] Permissions granted.');
      } catch (error) {
        console.error('[CCLiveKitWrapper] Error requesting permissions:', error);
        // Proceed even if error, to let LiveKit SDK handle/report it, or maybe the user only has audio?
        // But the fix is specifically for the connection error, so we try to proceed.
        setPermissionsGranted(true); 
      }
    };

    checkPermissions();

    return () => {
      console.log('[CCLiveKitWrapper] Unmounting! Cleaning up permissions stream.');
      if (permissionStreamRef.current) {
        permissionStreamRef.current.getTracks().forEach((track) => track.stop());
        permissionStreamRef.current = null;
      }
    };
  }, []);

  if (!token || !permissionsGranted) {
    console.log('[CCLiveKitWrapper] Token missing or permissions checking, showing loader...');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <span className="ml-2 text-lg font-medium text-foreground">미디어 서버 연결 및 권한 확인 중...</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={initialCamEnabled}
      audio={initialMicEnabled}
      token={token}
      serverUrl={serverUrl}
      connectOptions={{
        rtcConfig: {
          iceTransportPolicy: 'relay',
        },
      }}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
    >
      {children}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
