import { useRef, useEffect } from 'react';
import { useRoomStore } from '../../hooks/useRoomStore';
import { useStudyChat } from '../../hooks/useStudyChat';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';

export function StudyChatPanel() {
  const roomId = useRoomStore((state) => state.roomId); // Revert variable name
  const pendingCodeShare = useRoomStore((state) => state.pendingCodeShare);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);

  const { messages, sendMessage, sendCodeShare, currentUserId } = useStudyChat(roomId || 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    if (pendingCodeShare) {
      sendCodeShare(
        pendingCodeShare.code,
        pendingCodeShare.language,
        text,
        pendingCodeShare.ownerName,
        pendingCodeShare.problemTitle,
        pendingCodeShare.isRealtime,
        pendingCodeShare.problemId,
      );
      setPendingCodeShare(null);
    } else {
      sendMessage(text);
    }
  };

  const handleCancelShare = () => {
    setPendingCodeShare(null);
  };

  if (!roomId)
    return <div className="p-4 text-center text-muted-foreground">스터디 룸에 입장해주세요.</div>;

  return (
    <div className="flex flex-col h-full ">
      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        ref={scrollRef}
      >
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} isMine={msg.senderId === currentUserId} />
        ))}
      </div>

      <ChatInput
        onSend={handleSend}
        pendingCodeShare={pendingCodeShare}
        onCancelShare={handleCancelShare}
      />
    </div>
  );
}
