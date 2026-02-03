'use client';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuthStore } from '@/store/auth-store';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Loader2 } from 'lucide-react';

interface CCLiveKitWrapperProps {
  studyId: number;
  children: React.ReactNode;
}

export function CCLiveKitWrapper({ studyId, children }: CCLiveKitWrapperProps) {
  // const [token, setToken] = useState<string>(''); // Managed in store now
  const user = useAuthStore((state) => state.user);
  const token = useRoomStore((state) => state.videoToken);

  // Use env var for LiveKit URL, fallback to localhost.
  // For dev/docker, it's usually ws://localhost:7880 or wss://...
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

  if (!token) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <span className="ml-2 text-lg font-medium text-foreground">미디어 서버 연결 중...</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
    >
      {children}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
