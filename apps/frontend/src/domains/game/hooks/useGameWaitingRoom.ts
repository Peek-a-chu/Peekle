'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useGameSocketConnection } from './useGameSocketConnection';
import { getGameRoom, kickUser, enterGameRoom, confirmRoomReservation, cancelRoomReservation } from '@/domains/game/api/game-api';
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
  const fetchRoom = useCallback(async (): Promise<GameRoomDetail | null> => {
    if (!roomId) return null;
    try {
      const data = await getGameRoom(roomId);
      if (data) {
        console.log('🎮 [Game Room Data]', data);
        console.log('📚 workbookTitle:', data.workbookTitle);
        console.log('📝 problems:', data.problems);
        setRoom(data);
        return data;
      } else {
        toast.error('방 정보를 불러올 수 없습니다.');
        router.push('/game');
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch room:', error);
      toast.error('방 정보를 불러오는 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, router]);

  // 방 입장 (초기 진입 시 1회)
  useEffect(() => {
    if (!roomId || hasEnteredRef.current) return;

    const enter = async () => {
      try {
        // confirmRoomReservation이 방 정보를 반환
        // 로비에서 이미 reserveRoomSlot을 호출한 상태
        const data = await confirmRoomReservation(roomId);
        hasEnteredRef.current = true;

        if (data) {
          console.log('🎮 [Game Room Data]', data);
          console.log('📚 workbookTitle:', data.workbookTitle);
          console.log('📝 problems:', data.problems);
          setRoom(data);
          setIsLoading(false);

          // 입장 메시지 추가 (Socket 이벤트로 처리하므로 제거)
          // const currentUser = data.participants.find(p => p.id === userId);
          // if (currentUser) {
          //   setMessages((prev) => [
          //     ...prev,
          //     {
          //       id: `system-enter-self-${Date.now()}`,
          //       senderId: -1,
          //       senderNickname: 'System',
          //       profileImg: '',
          //       content: `${currentUser.nickname}님이 입장했습니다.`,
          //       timestamp: Date.now(),
          //       type: 'SYSTEM' as const,
          //     },
          //   ]);
          // }
        } else {
          toast.error('방 정보를 불러올 수 없습니다.');
          router.push('/game');
        }
      } catch (error) {
        console.error('Failed to enter room:', error);
        toast.error('방 입장에 실패했습니다.');
        router.push('/game');
      }
    };

    enter();
  }, [roomId, router, userId]);

  // Cleanup: Cancel reservation if user exits before entering room
  useEffect(() => {
    return () => {
      // Only cancel if we haven't successfully entered (hasEnteredRef will be false)
      if (roomId && !hasEnteredRef.current) {
        cancelRoomReservation(roomId).catch(err => {
          console.warn('Failed to cancel reservation on cleanup:', err);
        });
      }
    };
  }, [roomId]);

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

    // 4. Send WebSocket ENTER message to register as online in Redis
    // This is crucial for the backend's disconnect logic to recognize the user is active in the WAITING room
    console.log('[GameWaitingRoom] Sending WebSocket ENTER to register online status');
    client.publish({
      destination: '/pub/games/enter',
      body: JSON.stringify({ gameId: Number(roomId) })
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
        // 시스템 메시지 추가
        setMessages((prev) => [
          ...prev,
          {
            id: `system-enter-${Date.now()}`,
            senderId: -1,
            senderNickname: 'System',
            profileImg: '',
            content: `${event.data.nickname || '사용자'}님이 입장했습니다.`,
            timestamp: Date.now(),
            type: 'SYSTEM' as const,
          },
        ]);

        // 참여자 목록 즉시 업데이트
        if (event.data && event.data.userId) {
          setRoom(prev => {
            if (!prev) return null;

            // 이미 목록에 있는지 확인
            const existingIndex = prev.participants.findIndex(p => p.id === Number(event.data.userId));

            if (existingIndex >= 0) {
              // 이미 있으면 정보 업데이트
              const updatedParticipants = [...prev.participants];
              updatedParticipants[existingIndex] = {
                id: Number(event.data.userId),
                nickname: event.data.nickname,
                profileImg: event.data.profileImg || '',
                isHost: event.data.host ?? false,
                status: event.data.ready ? 'READY' : 'NOT_READY',
                team: event.data.team as Team,
              };
              return {
                ...prev,
                participants: updatedParticipants,
              };
            } else {
              // 없으면 새로 추가
              return {
                ...prev,
                participants: [
                  ...prev.participants,
                  {
                    id: Number(event.data.userId),
                    nickname: event.data.nickname,
                    profileImg: event.data.profileImg || '',
                    isHost: event.data.host ?? false,
                    status: event.data.ready ? 'READY' : 'NOT_READY',
                    team: event.data.team as Team,
                  },
                ],
                currentPlayers: prev.currentPlayers + 1,
              };
            }
          });
        }
        break;
      case 'LEAVE': // [수정] EXIT -> LEAVE (백엔드와 맞춤)
        // 시스템 메시지 추가
        setMessages((prev) => [
          ...prev,
          {
            id: `system-leave-${Date.now()}`,
            senderId: -1,
            senderNickname: 'System',
            profileImg: '',
            content: `${event.data.nickname || '사용자'}님이 나갔습니다.`,
            timestamp: Date.now(),
            type: 'SYSTEM' as const,
          },
        ]);
        fetchRoom();
        break;
      case 'KICK':
        if (Number(event.data.userId) === userId) {
          toast.error(event.data.message || '강퇴되었습니다.');
          router.push('/game');
        } else {
          // 시스템 메시지 추가
          setMessages((prev) => [
            ...prev,
            {
              id: `system-kick-${Date.now()}`,
              senderId: -1,
              senderNickname: 'System',
              profileImg: '',
              content: `${event.data.nickname || '사용자'}님이 강퇴되었습니다.`,
              timestamp: Date.now(),
              type: 'SYSTEM' as const,
            },
          ]);
          fetchRoom();
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
      case 'HOST_CHANGE':
        // 시스템 메시지 추가
        setMessages((prev) => [
          ...prev,
          {
            id: `system-host-${Date.now()}`,
            senderId: -1,
            senderNickname: 'System',
            profileImg: '',
            content: `${event.data.newHostNickname || '사용자'}님이 방장이 되었습니다.`,
            timestamp: Date.now(),
            type: 'SYSTEM' as const,
          },
        ]);
        fetchRoom();
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

  const onCountdownComplete = useCallback((mediaState?: { mic: boolean; cam: boolean }) => {
    const query = new URLSearchParams();
    if (mediaState) {
      query.set('mic', String(mediaState.mic));
      query.set('cam', String(mediaState.cam));
    }
    router.push(`/game/${roomId}/play?${query.toString()}`);
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
