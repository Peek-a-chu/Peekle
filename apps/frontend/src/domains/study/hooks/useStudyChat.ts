import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useRoomStore } from './useRoomStore';
import { ChatMessage, ChatType } from '../types/chat';
import { fetchStudyChats } from '@/api/studyApi';

export function useStudyChat(roomId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { currentUserId, participants, replyingTo } = useRoomStore();

  // Connect to socket if not already connected
  const socket = useSocket(roomId, currentUserId || 0);

  const currentUser = participants.find((p) => p.id === currentUserId);
  const senderName = currentUser?.nickname || `User ${currentUserId}`;

  // Fetch History
  useEffect(() => {
    if (roomId) {
      fetchStudyChats(roomId)
        .then((history) => {
          setMessages(
            history.map((msg) => ({
              id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              roomId: roomId,
              senderId: 0, // Mock or infer
              senderName: msg.senderName,
              content: msg.content,
              type: msg.type,
              createdAt: new Date().toISOString(), // Mock
              parentMessage: undefined,
            })),
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

        const alignedMessage: ChatMessage = {
          id: chatData.id || crypto.randomUUID(),
          roomId: roomId,
          senderId: Number(chatData.senderId || 0),
          senderName: chatData.senderName || 'Unknown',
          content: chatData.content || '',
          type: (chatData.type as ChatType) || 'TALK',
          parentMessage: chatData.parentMessage || undefined,
          metadata: chatData.metadata,
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
        studyId: roomId,
        content: content,
        parentId: replyingTo?.id,
      };

      socket.publish({
        destination: '/pub/studies/chat',
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
    ): void => {
      if (!socket || !currentUserId) return;

      const formattedContent = `[CODE:${language}] ${description}\nRef: ${ownerName || 'Unknown'} - ${problemTitle || 'Unknown'}\n${code}`;
      const payload = {
        studyId: roomId,
        content: formattedContent,
        parentId: replyingTo?.id,
        // Optional: if backend accepts metadata separately
        metadata: {
          code,
          language,
          problemTitle,
          ownerName,
        },
      };

      socket.publish({
        destination: '/pub/studies/chat',
        body: JSON.stringify(payload),
      });
    },
    [socket, roomId, currentUserId, replyingTo],
  );

  return {
    messages,
    sendMessage,
    sendCodeShare,
    currentUserId,
  };
}
