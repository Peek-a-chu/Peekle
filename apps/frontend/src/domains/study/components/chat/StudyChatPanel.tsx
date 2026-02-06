import { useRef, useEffect, useLayoutEffect } from 'react';
import { useRoomStore } from '../../hooks/useRoomStore';
import { useStudyChat } from '../../hooks/useStudyChat';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { Loader2 } from 'lucide-react';

export function StudyChatPanel() {
  const roomId = useRoomStore((state) => state.roomId); // Revert variable name
  const pendingCodeShare = useRoomStore((state) => state.pendingCodeShare);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);

  const {
    messages,
    sendMessage,
    sendCodeShare,
    currentUserId,
    loadMore,
    hasMore,
    isLoadingHistory,
  } = useStudyChat(roomId || 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const restoreRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const isLoadingOlderRef = useRef(false);

  // Restore scroll position after loading history (layout effect to avoid flicker)
  useLayoutEffect(() => {
    if (!scrollRef.current) return;

    if (restoreRef.current) {
      const container = scrollRef.current;
      const { scrollTop, scrollHeight } = restoreRef.current;
      const nextScrollHeight = container.scrollHeight;
      const delta = nextScrollHeight - scrollHeight;
      container.scrollTop = scrollTop + delta;
      restoreRef.current = null;
      isLoadingOlderRef.current = false;
      return;
    }

    if (shouldAutoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 32;
    shouldAutoScrollRef.current = isNearBottom;

    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    scrollDebounceRef.current = setTimeout(() => {
      if (scrollTop <= 8 && hasMore && !isLoadingHistory) {
        restoreRef.current = { scrollTop, scrollHeight };
        isLoadingOlderRef.current = true;
        void loadMore?.();
      }
    }, 200);
  };

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
        pendingCodeShare.externalId,
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
        className="flex-1 overflow-y-auto p-4 flex flex-col relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {isLoadingHistory && isLoadingOlderRef.current && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} data-msg-id={msg.id}>
            <ChatMessageItem message={msg} isMine={msg.senderId === currentUserId} />
          </div>
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
