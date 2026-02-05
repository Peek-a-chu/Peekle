'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useGameSocketConnection } from './useGameSocketConnection';
import { getGameRoom, kickUser, enterGameRoom } from '@/domains/game/api/game-api';
import { GameRoomDetail, ChatMessage, Team } from '@/domains/game/types/game-types';
import { toast } from 'sonner';

interface UseGameWaitingRoomReturn {
  room: GameRoomDetail | null;
  messages: ChatMessage[];
  currentUserId: number;
  isHost: boolean;
  isReady: boolean;
  isCountingDown: boolean;
  inviteModalOpen: boolean;
  isLoading: boolean;
  setInviteModalOpen: (open: boolean) => void;
  sendMessage: (content: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  onCountdownComplete: () => void;
  leaveRoom: () => void;
  kickParticipant: (participantId: number) => void;
  changeTeam: () => void;
}

export function useGameWaitingRoom(roomId: string): UseGameWaitingRoomReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userId = user ? user.id : 0;

  const { client, connected } = useGameSocketConnection(roomId, userId);

  const [room, setRoom] = useState<GameRoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const hasEnteredRef = useRef(false);

  // 현재 사용자 상태 계산
  const currentParticipant = room?.participants.find((p) => p.id === userId);
  const isHost = currentParticipant?.isHost ?? false;
  const isReady = currentParticipant?.status === 'READY';

  // 방 정보 조회
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await getGameRoom(roomId);
      if (data) {
        setRoom(data);
      } else {
        toast.error('방 정보를 불러올 수 없습니다.');
        router.push('/game');
      }
    } catch (error) {
      console.error('Failed to fetch room:', error);
      toast.error('방 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, router]);

  // 방 입장 (초기 진입 시 1회)
  useEffect(() => {
    if (!roomId || hasEnteredRef.current) return;

    const enter = async () => {
      try {
        // [수정] 멱등성 보장: 백엔드에서 이미 참여중이면 성공 처리하므로 안심하고 호출
        await enterGameRoom(roomId);
        hasEnteredRef.current = true;
        fetchRoom(); // 입장 후 정보 갱신
      } catch (error) {
        console.error('Failed to enter room:', error);
        toast.error('방 입장에 실패했습니다.');
        router.push('/game');
      }
    };

    enter();
  }, [roomId, fetchRoom, router]);

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!connected || !client) return;

    // 1. Room Status Subscription
    const roomSub = client.subscribe(`/topic/games/${roomId}/room`, (msg) => {
      try {
        const event = JSON.parse(msg.body);
        handleRoomEvent(event);
      } catch (e) {
        console.error('Failed to parse room event:', e);
      }
    });

    // 2. Chat Subscription (Global)
    const chatSub = client.subscribe(`/topic/games/${roomId}/chat/global`, (msg) => {
      try {
        const response = JSON.parse(msg.body);
        if (response.type !== 'CHAT') return;

        const chatData = response.data;
        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: Number(chatData.senderId),
          senderNickname: chatData.senderNickname || 'Unknown',
          profileImg: chatData.profileImg,
          content: chatData.message,
          timestamp: chatData.timestamp,
          senderTeam: chatData.teamColor
        };
        setMessages((prev) => [...prev, newMsg]);
      } catch (e) {
        console.error('Failed to parse chat message:', e);
      }
    });

    // 3. Error Subscription (User Specific)
    const errorSub = client.subscribe('/user/queue/errors', (msg) => {
      if (msg.body) {
        toast.error(msg.body);
      }
    });

    return () => {
      roomSub.unsubscribe();
      chatSub.unsubscribe();
      errorSub.unsubscribe();
    };
  }, [connected, client, roomId]);

  const handleRoomEvent = (event: any) => {
    switch (event.type) {
      case 'ENTER':
      case 'LEAVE': // [수정] EXIT -> LEAVE (백엔드와 맞춤)
        fetchRoom();
        break;
      case 'KICK':
        if (Number(event.data.userId) === userId) {
          toast.error(event.data.message || '강퇴되었습니다.');
          router.push('/game');
        } else {
          fetchRoom();
          toast.info('참여자가 강퇴되었습니다.');
        }
        break;
      case 'READY':
        if (event.data) {
          setRoom(prev => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === Number(event.data.userId)
                  ? { ...p, status: event.data.isReady ? 'READY' : 'NOT_READY' }
                  : p
              )
            };
          });
        }
        break;
      case 'TEAM': // [수정] TEAM_CHANGE -> TEAM
        if (event.data) {
          setRoom(prev => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === Number(event.data.userId)
                  ? { ...p, team: event.data.team as Team }
                  : p
              )
            };
          });
        }
        break;
      case 'START':
        setIsCountingDown(true);
        break;
    }
  };

  const sendMessage = useCallback((content: string) => {
    if (!client || !connected) return;
    client.publish({
      destination: '/pub/games/chat',
      body: JSON.stringify({
        gameId: Number(roomId),
        message: content,
        scope: 'GLOBAL',
        teamColor: null // 대기실은 전체 채팅이므로 팀 정보 제외
      })
    });
  }, [client, connected, roomId]);

  const toggleReady = useCallback(() => {
    if (!client || !connected) return;
    client.publish({
      destination: '/pub/games/ready',
      body: JSON.stringify({ gameId: Number(roomId) })
    });
  }, [client, connected, roomId]);

  const startGame = useCallback(() => {
    if (!client || !connected || !isHost) return;
    client.publish({
      destination: '/pub/games/start',
      body: JSON.stringify({ gameId: Number(roomId) })
    });
  }, [client, connected, roomId, isHost]);

  const changeTeam = useCallback(() => {
    if (!client || !connected || !currentParticipant?.team) return;
    const currentTeam = currentParticipant.team;
    const targetTeam = currentTeam === 'RED' ? 'BLUE' : 'RED';

    client.publish({
      destination: '/pub/games/team',
      body: JSON.stringify({ gameId: Number(roomId), team: targetTeam })
    });
  }, [client, connected, roomId, currentParticipant]);

  const leaveRoom = useCallback(() => {
    if (client && connected) {
      client.publish({
        destination: '/pub/games/leave',
        body: JSON.stringify({ gameId: Number(roomId) })
      });
    }
    // "나가기" 버튼 클릭 시에는 명시적으로 이동
    router.replace('/game');
  }, [client, connected, roomId, router]);

  const kickParticipant = useCallback(async (targetUserId: number) => {
    const success = await kickUser(roomId, String(targetUserId));
    if (success) {
      toast.success('참여자를 강퇴했습니다.');
    } else {
      toast.error('강퇴에 실패했습니다.');
    }
  }, [roomId]);

  const onCountdownComplete = useCallback(() => {
    router.push(`/game/${roomId}/play`);
  }, [router, roomId]);



  return {
    room,
    messages,
    currentUserId: userId,
    isHost,
    isReady,
    isCountingDown,
    inviteModalOpen,
    isLoading,
    setInviteModalOpen,
    sendMessage,
    toggleReady,
    startGame,
    onCountdownComplete,
    leaveRoom,
    kickParticipant,
    changeTeam,
  };
}
