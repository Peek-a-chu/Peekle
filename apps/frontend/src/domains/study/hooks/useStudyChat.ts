import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useRoomStore } from './useRoomStore';
import { ChatMessage, ChatType } from '../types/chat';
import { fetchStudyChats } from '@/app/api/studyApi';

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
              ...msg,
              id: msg.id || `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              roomId: roomId, // Ensure roomId is set
            })),
          );
        })
        .catch((err) => console.error('Failed to load chat history', err));
    }
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: Partial<ChatMessage>): void => {
      // Align payload from backend
      const alignedMessage: ChatMessage = {
        id: message.id || crypto.randomUUID(),
        roomId: Number(message.roomId || roomId),
        senderId: Number(message.senderId || 0),
        senderName: message.senderName || 'Unknown',
        content: message.content || '',
        type: message.type || 'TALK',
        parentMessage: message.parentMessage,
        metadata: message.metadata,
        createdAt: message.createdAt || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, alignedMessage]);
    };

    socket.on('chat-message', handleMessage);

    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [socket, roomId]);

  const sendMessage = useCallback(
    (content: string): void => {
      if (!socket || !currentUserId) return;

      const payload = {
        id: crypto.randomUUID(),
        roomId: String(roomId),
        senderId: currentUserId,
        senderName,
        message: content,
        type: 'TALK' as ChatType,
        parentMessage: replyingTo
          ? {
              id: replyingTo.id,
              senderId: replyingTo.senderId,
              senderName: replyingTo.senderName,
              content: replyingTo.content,
              type: replyingTo.type,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      };

      socket.emit('chat-message', payload);
    },
    [socket, roomId, currentUserId, senderName, replyingTo],
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

      const payload = {
        id: crypto.randomUUID(),
        roomId: String(roomId),
        senderId: currentUserId,
        senderName,
        message: description,
        type: 'CODE' as ChatType,
        parentMessage: replyingTo
          ? {
              id: replyingTo.id,
              senderId: replyingTo.senderId,
              senderName: replyingTo.senderName,
              content: replyingTo.content,
              type: replyingTo.type,
            }
          : undefined,
        metadata: {
          code,
          language,
          ownerName,
          problemTitle,
          isRealtime,
        },
        createdAt: new Date().toISOString(),
      };

      socket.emit('chat-message', payload);
    },
    [socket, roomId, currentUserId, senderName, replyingTo],
  );

  return {
    messages,
    sendMessage,
    sendCodeShare,
    currentUserId,
  };
}
