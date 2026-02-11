import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

export function MediaDeviceSynchronizer() {
    const room = useRoomContext();
    const { selectedCameraId, selectedMicId } = useSettingsStore();

    // Sync Camera
    useEffect(() => {
        if (room && selectedCameraId && selectedCameraId !== 'default') {
            console.log('[MediaDeviceSynchronizer] Switching Camera to:', selectedCameraId);
            room.switchActiveDevice('videoinput', selectedCameraId).catch((err) => {
                console.error('Failed to set camera device:', err);
            });
        }
    }, [room, selectedCameraId]);

    // Sync Microphone
    useEffect(() => {
        if (room && selectedMicId && selectedMicId !== 'default') {
            console.log('[MediaDeviceSynchronizer] Switching Microphone to:', selectedMicId);
            room.switchActiveDevice('audioinput', selectedMicId).catch((err) => {
                console.error('Failed to set microphone device:', err);
            });
        }
    }, [room, selectedMicId]);

    return null;
}
