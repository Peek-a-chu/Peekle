import { Loader2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useRoomStore } from '../../hooks/useRoomStore';
import { useStudyChat } from '../../hooks/useStudyChat';
import { ChatInput } from './ChatInput';
import { ChatMessageItem } from './ChatMessageItem';

export function StudyChatPanel() {
  const roomId = useRoomStore((state) => state.roomId);
  const pendingCodeShare = useRoomStore((state) => state.pendingCodeShare);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);
  const replyingTo = useRoomStore((state) => state.replyingTo);
  const setReplyingTo = useRoomStore((state) => state.setReplyingTo);

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

  const messageLookup = useMemo(
    () =>
      Object.fromEntries(
        messages
          .filter((message) => Boolean(message.id))
          .map((message) => [message.id as string, message]),
      ),
    [messages],
  );

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

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, []);

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

    setReplyingTo(null);
  };

  const handleCancelShare = () => {
    setPendingCodeShare(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (!roomId) {
    return <div className="p-4 text-center text-muted-foreground">Join a study room first.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative flex flex-1 flex-col overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {isLoadingHistory && isLoadingOlderRef.current && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            data-msg-id={msg.id}
            className={msg.senderId === currentUserId ? 'flex justify-end' : 'flex justify-start'}
          >
            <ChatMessageItem
              message={msg}
              isMine={msg.senderId === currentUserId}
              messageLookup={messageLookup}
            />
          </div>
        ))}
      </div>

      <ChatInput
        onSend={handleSend}
        pendingCodeShare={pendingCodeShare}
        onCancelShare={handleCancelShare}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}
