import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useRoomStore } from './useRoomStore';
import { ChatMessage, ChatType } from '../types/chat';
import { fetchStudyChats } from '../api/studyApi';
import type { ChatMessageResponse } from '../types';

function normalizeChatType(
  rawType: ChatMessageResponse['type'] | ChatType | undefined,
  metadata?: ChatMessage['metadata'],
): ChatType {
  // If the backend sends TALK but includes code metadata, treat it as CODE
  if (metadata?.code) {
    return 'CODE';
  }

  if (!rawType) {
    return 'TALK';
  }

  return rawType as ChatType;
}

export function useStudyChat(roomId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { currentUserId, participants, replyingTo, selectedProblemId } = useRoomStore();

  // Connect to socket if not already connected
  const socket = useSocket(roomId, currentUserId || 0);

  const currentUser = participants.find((p) => p.id === currentUserId);
  const senderName = currentUser?.nickname || `User ${currentUserId}`;

  // Fetch History
  useEffect(() => {
    if (roomId) {
      fetchStudyChats(roomId)
        .then((history) => {
          // Backend returns latest first (Page 0), but UI renders top-to-bottom (oldest first)
          // So we need to reverse the array.
          const sortedHistory = [...history].reverse();

          setMessages(
            sortedHistory.map((msg) => {
              const metadata = msg.metadata;
              const type = normalizeChatType(msg.type, metadata);

              return {
                id: msg.id || `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                roomId: roomId,
                senderId: msg.senderId,
                senderName: msg.senderName,
                content: msg.content,
                type,
                createdAt: msg.createdAt,
                parentMessage: undefined, // API might not return parent details fully yet
                metadata,
              } as ChatMessage;
            }),
          );
        })
        .catch((err) => console.error('Failed to load chat history', err));
    }
  }, [roomId]);

  // STOMP Subscription
  useEffect(() => {
    if (!socket || !roomId) return; // Prevent subscription to room specific topic if roomId is invalid (0)

    // Spec Topic: /topic/studies/rooms/{id}/chat
    const subscription = socket.subscribe(`/topic/studies/rooms/${roomId}/chat`, (message) => {
      try {
        const body = JSON.parse(message.body);
        const chatData = body.data || body; // Handle SocketResponse<Chat> wrapper
        const metadata = chatData.metadata;
        const type = normalizeChatType(chatData.type as ChatType | undefined, metadata);

        const alignedMessage: ChatMessage = {
          id: chatData.id || crypto.randomUUID(),
          roomId: roomId,
          senderId: Number(chatData.senderId || 0),
          senderName: chatData.senderName || 'Unknown',
          content: chatData.content || '',
          type,
          parentMessage: chatData.parentMessage || undefined,
          metadata,
          createdAt: chatData.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, alignedMessage]);
      } catch (e) {
        console.error('Failed to parse chat message', e);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [socket, roomId]);

  const sendMessage = useCallback(
    (content: string): void => {
      if (!socket || !currentUserId) return;

      const payload = {
        content: content,
        type: 'TALK',
        parentId: replyingTo?.id,
      };

      socket.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify(payload),
      });
    },
    [socket, roomId, currentUserId, replyingTo],
  );

  const sendCodeShare = useCallback(
    (
      code: string,
      language: string,
      description: string,
      ownerName?: string,
      problemTitle?: string,
      isRealtime?: boolean,
      problemId?: number,
    ): void => {
      if (!socket || !currentUserId) return;

      const payload = {
        // 채팅 본문에는 사용자의 코멘트(설명)만 저장하고,
        // 문제 번호/제목/언어/소유자는 모두 metadata 기반 카드 UI로 표현한다.
        content: description,
        // Use a dedicated CODE type so ChatMessageItem can render CodeShareCard and enable navigation.
        type: 'CODE',
        parentId: replyingTo?.id,
        metadata: {
          isRefChat: true,
          isRealtime: !!isRealtime,
          targetUserId: isRealtime ? currentUserId : undefined,
          problemId: problemId,
          code, // Always include code so we can show snapshot or fallback view
          language,
          problemTitle,
          ownerName,
        },
      };

      socket.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify(payload),
      });
    },
    [socket, roomId, currentUserId, replyingTo, selectedProblemId],
  );

  return {
    messages,
    sendMessage,
    sendCodeShare,
    currentUserId,
  };
}
