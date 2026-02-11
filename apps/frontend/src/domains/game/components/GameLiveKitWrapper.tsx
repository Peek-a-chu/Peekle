'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useGameLiveKitStore } from '@/domains/game/hooks/useGameLiveKitStore';
import { Loader2 } from 'lucide-react';

import { MediaDeviceSynchronizer } from '@/components/common/MediaDeviceSynchronizer';

interface GameLiveKitWrapperProps {
    roomId: number;
    children: React.ReactNode;
    initialMicEnabled?: boolean;
    initialCamEnabled?: boolean;
}

export function GameLiveKitWrapper({
    roomId,
    children,
    initialMicEnabled = false,
    initialCamEnabled = true,
}: GameLiveKitWrapperProps) {
    const token = useGameLiveKitStore((state) => state.videoToken);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const permissionStreamRef = useRef<MediaStream | null>(null);

    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

    useEffect(() => {
        console.log('[GameLiveKitWrapper] Mounted. RoomId:', roomId, 'Token:', token ? 'Present' : 'Missing');

        const checkPermissions = async () => {
            try {
                console.log('[GameLiveKitWrapper] Requesting media permissions...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                });
                permissionStreamRef.current = stream;
                setPermissionsGranted(true);
                console.log('[GameLiveKitWrapper] Permissions granted.');
            } catch (error) {
                console.error('[GameLiveKitWrapper] Error requesting permissions:', error);
                // Proceed even if error to let LiveKit SDK handle it
                setPermissionsGranted(true);
            }
        };

        checkPermissions();

        return () => {
            console.log('[GameLiveKitWrapper] Unmounting! Cleaning up permissions stream.');
            if (permissionStreamRef.current) {
                permissionStreamRef.current.getTracks().forEach((track) => track.stop());
                permissionStreamRef.current = null;
            }
        };
    }, [roomId, token]);

    if (!token || !permissionsGranted) {
        console.log('[GameLiveKitWrapper] Token missing or permissions checking, showing loader...');
        return (
            <div className="flex h-full w-full items-center justify-center bg-background/80">
                <Loader2 className="animate-spin text-primary h-6 w-6" />
                <span className="ml-2 text-sm font-medium text-muted-foreground">미디어 서버 연결 중...</span>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={initialCamEnabled}
            audio={initialMicEnabled}
            token={token}
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
