'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SocketProvider } from '@/domains/study/context/SocketContext';
import { WhiteboardPanel } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

const TEST_USER_ID = 777; // Test User

function TestWhiteboardContent({ roomId }: { roomId: number }) {
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setIsWhiteboardActive = useRoomStore((state) => state.setIsWhiteboardActive);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);

  useEffect(() => {
    // Initialize Room Store for Testing
    setRoomInfo({ roomId, roomTitle: 'Whiteboard Test Room' });
    setCurrentUserId(TEST_USER_ID);

    // Force enable whiteboard
    setIsWhiteboardActive(true);
    setWhiteboardOverlayOpen(true);
  }, [setRoomInfo, setCurrentUserId, setIsWhiteboardActive, setWhiteboardOverlayOpen, roomId]);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="font-bold text-lg">Whiteboard Test Page</h1>
          <p className="text-xs text-muted-foreground">
            Room: {roomId} | User: {TEST_USER_ID}
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
  const roomId = Number(params.id);

  return (
    <SocketProvider roomId={roomId} userId={TEST_USER_ID}>
      <TestWhiteboardContent roomId={roomId} />
    </SocketProvider>
  );
}
