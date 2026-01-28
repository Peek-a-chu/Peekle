'use client';

import { useEffect, useRef } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudyChat } from '@/domains/study/hooks/useStudyChat'; // Now using real hook
import { ChatMessageItem } from '@/domains/study/components/chat/ChatMessageItem';
import { ChatInput } from '@/domains/study/components/chat/ChatInput';

// Mock OTHER User for simulation triggers (visual only),
// but Real User ID for socket connection.
const TEST_USER_ID = 999;
const ROOM_ID = 1;

export default function TestChatPage(): React.ReactNode {
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);
  const pendingCodeShare = useRoomStore((state) => state.pendingCodeShare);

  // Use Real Hook
  const { messages, sendMessage, sendCodeShare } = useStudyChat(ROOM_ID);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Setup Store for this standalone page
    setRoomInfo({ roomId: ROOM_ID, roomTitle: 'Real Socket Room' });
    setCurrentUserId(TEST_USER_ID);
    setParticipants([
      {
        id: TEST_USER_ID,
        nickname: 'Standalone Tester',
        isOnline: true,
        isOwner: false,
        odUid: '999',
        isMuted: false,
        isVideoOff: false,
      },
      {
        id: 1,
        nickname: 'Study Room User',
        isOnline: true,
        isOwner: true,
        odUid: '1',
        isMuted: false,
        isVideoOff: false,
      },
    ]);
  }, [setRoomInfo, setCurrentUserId, setParticipants]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string): void => {
    if (pendingCodeShare) {
      sendCodeShare(
        pendingCodeShare.code,
        pendingCodeShare.language,
        text,
        pendingCodeShare.ownerName,
        pendingCodeShare.problemTitle,
      );
      setPendingCodeShare(null);
    } else {
      sendMessage(text);
    }
  };

  // Triggers for "Ref Chat" simulation (Mocking IDE actions)
  const triggerRefChat = (): void => {
    setPendingCodeShare({
      code: 'print("My Standalone Code")',
      language: 'python',
      ownerName: 'Standalone Tester',
      problemTitle: 'DFS Algorithm',
    });
  };

  return (
    <div className="h-screen w-full flex bg-gray-100 p-8 gap-8 items-center justify-center">
      <div className="flex flex-col gap-4">
        <div className="bg-white p-4 rounded-lg shadow w-80">
          <h2 className="font-bold mb-2">Test Controls</h2>
          <p className="text-xs text-muted-foreground mb-4">
            This page connects to Room 1 as User 999. You can chat with User 1 (Study Page).
          </p>
          <button
            onClick={triggerRefChat}
            className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200"
          >
            Simulate IDE Ref Chat (My Code)
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="w-[400px] h-[600px] bg-white border shadow-xl rounded-xl overflow-hidden flex flex-col ring-4 ring-black/5">
        <div className="bg-indigo-600 text-white p-4 font-bold flex justify-between items-center">
          <span>Chat (Room {ROOM_ID})</span>
          <span className="text-xs font-normal opacity-80">User: {TEST_USER_ID}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Connecting to socket... or no messages.
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} isMine={msg.senderId === TEST_USER_ID} />
          ))}
        </div>

        <ChatInput
          onSend={handleSend}
          pendingCodeShare={pendingCodeShare}
          onCancelShare={() => setPendingCodeShare(null)}
        />
      </div>
    </div>
  );
}
