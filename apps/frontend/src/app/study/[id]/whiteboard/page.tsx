'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { SocketProvider } from '@/domains/study/context/SocketContext';
import { WhiteboardPanel } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

function TestWhiteboardContent({ roomId, userId }: { roomId: number; userId: number }) {
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setIsWhiteboardActive = useRoomStore((state) => state.setIsWhiteboardActive);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);

  useEffect(() => {
    // Initialize Room Store for Testing
    setRoomInfo({ roomId, roomTitle: 'Whiteboard Test Room' });
    setCurrentUserId(userId);

    // Force enable whiteboard
    setIsWhiteboardActive(true);
    setWhiteboardOverlayOpen(true);
  }, [setRoomInfo, setCurrentUserId, setIsWhiteboardActive, setWhiteboardOverlayOpen, roomId, userId]);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="font-bold text-lg">Whiteboard Test Page</h1>
          <p className="text-xs text-muted-foreground">
            Room: {roomId} | User: {userId}
          </p>
        </div>
        <div className="text-sm text-blue-600 font-medium">Standalone Mode</div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <WhiteboardPanel className="h-full w-full border-none" />
      </div>
    </div>
  );
}

export default function TestWhiteboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = Number(params.id);
  const userId = Number(searchParams.get('userId')) || 777;

  return (
    <SocketProvider roomId={roomId} userId={userId}>
      <TestWhiteboardContent roomId={roomId} userId={userId} />
    </SocketProvider>
  );
}
