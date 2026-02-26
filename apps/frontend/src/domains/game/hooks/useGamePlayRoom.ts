'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GamePlayState,
  GameProblem,
  GamePlayParticipant,
  ChatMessage,
  Team,
} from '@/domains/game/types/game-types';
import { getGameRoom, enterGameRoom, confirmRoomReservation } from '@/domains/game/api/game-api';
import { useGameTimer } from './useGameTimer';
import { useGameSocketConnection } from './useGameSocketConnection';
import { useAuthStore } from '@/store/auth-store';
import { useGameLiveKitStore } from './useGameLiveKitStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// 문제별 코드 상태 (언어별로 저장)
interface ProblemCodeState {
  [problemId: number]: {
    lastLanguage: string;
    codes: {
      [language: string]: string;
    };
  };
}

interface UseGamePlayRoomReturn {
  // 게임 상태
  gameState: GamePlayState | null;
  isLoading: boolean;

  // 선택된 문제
  selectedProblemId: number | null;
  selectedProblem: GameProblem | null;
  selectProblem: (problemId: number) => void;

  // 코드 상태
  currentCode: string;
  currentLanguage: string;
  setCode: (code: string, languageOverride?: string) => void;
  setLanguage: (language: string) => void;

  // 타이머
  formattedTime: string;
  remainingTime: number;

  // 참여자
  participants: GamePlayParticipant[];
  currentUserId: number;

  // 채팅
  messages: ChatMessage[];
  sendMessage: (content: string) => void;

  // 액션
  submitCode: () => void;
  leaveRoom: () => void;
  forfeitGame: () => void;

  // 온라인 상태
  onlineUserIds: Set<number>;
}

const DEFAULT_CODE: Record<string, string> = {
  python: `import sys\n\n# 코드를 작성해주세요\nprint("Hello World!")`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // 코드를 작성해주세요\n        System.out.println("Hello World!");\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    // 코드를 작성해주세요\n    cout << "Hello World!" << endl;\n    return 0;\n}`,
};

export function useGamePlayRoom(roomIdString: string): UseGamePlayRoomReturn {
  const roomId = Number(roomIdString);
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserId = user?.id || 0;
  const { setVideoToken, clearVideoToken } = useGameLiveKitStore();

  const [gameState, setGameState] = useState<GamePlayState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [problemCodes, setProblemCodes] = useState<ProblemCodeState>({});
  const [currentLanguage, setCurrentLanguage] = useState('python');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [graceTime, setGraceTime] = useState(60);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [clockOffset, setClockOffset] = useState(0);

  // 소켓 연결
  const { client, connected } = useGameSocketConnection(roomId, currentUserId);

  // 초기 상태 로드 및 입장
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // enterGameRoom이 방 정보를 반환하므로 중복 조회 불필요
        const room = await enterGameRoom(roomIdString);
        if (room) {
          // GameRoomDetail -> GamePlayState 변환
          const playState: GamePlayState = {
            roomId: room.id,
            title: room.title,
            mode: room.mode,
            teamType: room.teamType,
            timeLimit: room.timeLimit,
            startTime: room.startTime,
            serverTime: room.serverTime,
            remainingTime: room.timeLimit, // [TEST] Seconds directly
            problems: room.problems || [],
            participants: (room.participants || []).map((p: any) => ({
              ...p,
              score: 0,
              solvedCount: 0,
            })),
          };
          setGameState(playState);
          if (room.serverTime) {
            const offset = Date.now() - room.serverTime;
            setClockOffset(offset);
            console.log(`[TimerSync] Clock offset calculated: ${offset}ms (Client: ${Date.now()}, Server: ${room.serverTime})`);
          }
          if (playState.problems.length > 0) {
            setSelectedProblemId(playState.problems[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to initialize play room:', error);
        toast.error('방 입장에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (roomIdString) init();
  }, [roomIdString]);

  // Ref for GameState to avoid stale closures in socket callbacks
  const gameStateRef = useRef<GamePlayState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 소켓 구독 및 이벤트 핸들링
  useEffect(() => {
    if (!client || !connected) return;

    // 1. Room Status Subscription
    const roomSub = client.subscribe(`/topic/games/${roomId}/room`, (msg) => {
      try {
        const event = JSON.parse(msg.body);
        const { type, data } = event;

        switch (type) {
          case 'ENTER':
          case 'LEAVE':
            // 참여자 목록 갱신을 위해 방 정보 다시 불러오기
            getGameRoom(roomIdString).then((room) => {
              if (room) {
                setGameState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    participants: (room.participants || []).map((p: any) => ({
                      ...p,
                      score: 0, // 기존 점수 유지 로직은 필요시 추가
                      solvedCount: 0,
                    })),
                  };
                });
              }
            });
            break;
          case 'START':
            console.log('Game START event received:', data);
            setGameState((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'PLAYING',
                startTime: data.startTime,
                serverTime: data.serverTime,
                problems: (data.problems || []).map((p: any) => ({
                  ...p,
                  status: 'UNSOLVED',
                })),
              };
            });
            if (data.serverTime) {
              const offset = Date.now() - data.serverTime;
              setClockOffset(offset);
              console.log(`[TimerSync] Clock offset updated from START event: ${offset}ms`);
            }
            if (data.problems && data.problems.length > 0) {
              setSelectedProblemId(data.problems[0].id);
            }
            break;
          case 'SOLVED':
            toast.success(`${data.nickname}님이 ${data.problemTitle || '문제'}를 풀었습니다!`);
            // [Fix] data.team -> data.teamColor (Backend sends teamColor)
            updateProblemStatus(Number(data.problemId), 'SOLVED', Number(data.userId), data.teamColor);
            break;
          case 'SCORE_UPDATE':
            // 팀 점수 및 개인 변동 업데이트 처리
            break;
          case 'FINISH_TIMER_START':
            console.log('⏱️ FINISH_TIMER_START event received:', data);
            toast.info(`${data.nickname}님이 모든 문제를 풀었습니다! 1분 후 게임이 종료됩니다.`, {
              duration: 5000,
            });
            setIsGracePeriod(true);
            setGraceTime(data.remainSeconds || 60);
            break;
          case 'GAME_END':
            console.log('🏆 GAME_END event received:', data);
            setGameState((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'END',
                result: data,
              };
            });
            break;
        }
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
          content: chatData.message, // Map backend 'message' to 'content'
          timestamp: chatData.timestamp,
          senderTeam: chatData.teamColor
        };
        setMessages((prev) => [...prev, newMsg]);
      } catch (e) {
        console.error('Failed to parse chat message:', e);
      }
    });

    // 3. Ranking Subscription (Real-time Score Updates)
    const rankingSub = client.subscribe(`/topic/games/${roomId}/ranking`, (msg) => {
      try {
        const response = JSON.parse(msg.body);
        if (response.type === 'RANKING_UPDATE') {
          const data = response.data;
          console.log('📊 RANKING_UPDATE received:', data);

          // Toast for verification (Validation Step 13)
          const toastNickname = data.nickname || `${data.userId}번 유저`;

          // Use Ref to get the latest mode state
          if (gameStateRef.current?.mode !== 'SPEED_RACE') {
            toast.info(`[점수 갱신] ${toastNickname}: ${data.score}점 (${data.solvedCount}문제)`);
          }

          setGameState((prev) => {
            if (!prev) return null;

            // 1. 참여자 정보 업데이트
            const newParticipants = prev.participants.map((p) => {
              if (p.id === Number(data.userId)) {
                return {
                  ...p,
                  score: data.score,
                  solvedCount: data.solvedCount,
                };
              }
              return p;
            });

            // 2. 팀 점수 재계산 (팀전인 경우)
            let newScores = prev.scores;
            if (prev.teamType === 'TEAM') {
              const redScore = newParticipants
                .filter((p) => p.team === 'RED')
                .reduce((sum, p) => sum + (p.solvedCount || 0), 0);
              const blueScore = newParticipants
                .filter((p) => p.team === 'BLUE')
                .reduce((sum, p) => sum + (p.solvedCount || 0), 0);
              newScores = { RED: redScore, BLUE: blueScore };
            }

            return {
              ...prev,
              participants: newParticipants,
              scores: newScores,
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse ranking message:', e);
      }
    });

    // 4. VIDEO_TOKEN Subscription (LiveKit)
    const videoTokenSub = client.subscribe(`/topic/games/${roomId}/video-token/${currentUserId}`, (msg) => {
      try {
        const response = JSON.parse(msg.body);
        if (response.type === 'VIDEO_TOKEN') {
          console.log('[GamePlayRoom] VIDEO_TOKEN received');
          setVideoToken(response.data);
        } else if (response.type === 'ERROR') {
          console.error('[GamePlayRoom] VIDEO_TOKEN error:', response.data);
          toast.error('화상 연결에 실패했습니다.');
        }
      } catch (e) {
        console.error('Failed to parse video token message:', e);
      }
    });

    // 5. Subscibe to Connected Users (Online Status)
    const onlineSub = client.subscribe(`/topic/games/${roomId}/connected-users`, (msg) => {
      try {
        const users = JSON.parse(msg.body); // Expecting number[] of userIds
        if (Array.isArray(users)) {
          setOnlineUserIds(new Set(users.map(Number)));
        }
      } catch (e) {
        console.error('Failed to parse connected users:', e);
      }
    });

    // 6. Subscribe to User-Specific Errors
    const errorSub = client.subscribe(`/topic/games/${roomId}/error/${currentUserId}`, (msg) => {
      try {
        const response = JSON.parse(msg.body);
        if (response.type === 'ERROR') {
          toast.error(response.data);
        }
      } catch (e) {
        console.error('Failed to parse error message:', e);
      }
    });

    // 7. Request Initial Connected Users
    console.log('[GamePlayRoom] Requesting connected users list');
    client.publish({
      destination: '/pub/games/connected-users',
      body: JSON.stringify({ gameId: roomId })
    });

    // 7. Send WebSocket ENTER message to trigger VIDEO_TOKEN generation
    // This must happen AFTER subscriptions are set up to receive the token
    console.log('[GamePlayRoom] Sending WebSocket ENTER to trigger VIDEO_TOKEN');
    client.publish({
      destination: '/pub/games/enter',
      body: JSON.stringify({ gameId: roomId })
    });

    return () => {
      roomSub.unsubscribe();
      chatSub.unsubscribe();
      rankingSub.unsubscribe();
      videoTokenSub.unsubscribe();
      onlineSub.unsubscribe();
      errorSub.unsubscribe();
      clearVideoToken();
    };
  }, [client, connected, roomId, roomIdString, currentUserId, setVideoToken, clearVideoToken]);

  const updateProblemStatus = (
    problemId: number,
    status: 'SOLVED' | 'UNSOLVED',
    userId: number,
    teamColor?: Team
  ) => {
    setGameState(prev => {
      if (!prev) return null;

      const solver = prev.participants.find(p => p.id === userId);
      const nickname = solver ? solver.nickname : 'Unknown';

      return {
        ...prev,
        problems: prev.problems.map(p =>
          p.id === problemId
            ? { ...p, status, solvedBy: [...(p.solvedBy || []), { id: userId, nickname, team: teamColor }] }
            : p
        )
      };
    });
  };

  // 타이머
  const isSpeedRace = gameState?.mode === 'SPEED_RACE';

  const calculateRemainingTime = () => {
    if (!gameState?.startTime) return gameState?.timeLimit ?? 1800;
    const now = Date.now() - clockOffset;
    // startTime is in milliseconds (System.currentTimeMillis from backend)
    const elapsedSeconds = Math.floor((now - gameState.startTime) / 1000);
    const remaining = gameState.timeLimit - elapsedSeconds;
    return remaining > 0 ? remaining : 0;
  };

  const calculateElapsedSeconds = () => {
    if (!gameState?.startTime) return 0;
    const now = Date.now() - clockOffset;
    return Math.floor((now - gameState.startTime) / 1000);
  };

  const timerInitialTime = isGracePeriod
    ? graceTime
    : (isSpeedRace ? calculateElapsedSeconds() : calculateRemainingTime());
  const timeUpToastShownRef = useRef(false);

  // Room ID가 변경되면 토스트/유예상태 초기화
  useEffect(() => {
    timeUpToastShownRef.current = false;
    setIsGracePeriod(false);
  }, [roomIdString]);

  const { formattedTime, time, reset } = useGameTimer({
    initialTime: timerInitialTime,
    mode: (isSpeedRace && !isGracePeriod) ? 'countup' : 'countdown',
    autoStart: gameState !== null,
    onTimeUp: useCallback(() => {
      if (!isSpeedRace && !timeUpToastShownRef.current) {
        toast.warning('시간이 종료되었습니다!');
        timeUpToastShownRef.current = true;
      }
    }, [isSpeedRace]),
  });

  // 선택된 문제
  const selectedProblem = gameState?.problems.find((p) => p.id === selectedProblemId) ?? null;

  // 현재 코드
  const currentCode =
    problemCodes[selectedProblemId ?? 0]?.codes[currentLanguage] || DEFAULT_CODE[currentLanguage];

  // 문제 선택
  const selectProblem = useCallback(
    (problemId: number) => {
      setSelectedProblemId(problemId);
      const lastLang = problemCodes[problemId]?.lastLanguage || 'python';
      setCurrentLanguage(lastLang);
    },
    [problemCodes],
  );

  // 코드 설정
  const setCode = useCallback(
    (code: string, languageOverride?: string) => {
      if (!selectedProblemId) return;
      const targetLanguage = languageOverride || currentLanguage;

      setProblemCodes((prev) => {
        const problemState = prev[selectedProblemId] || {
          lastLanguage: targetLanguage,
          codes: {},
        };
        return {
          ...prev,
          [selectedProblemId]: {
            ...problemState,
            lastLanguage: targetLanguage,
            codes: {
              ...problemState.codes,
              [targetLanguage]: code,
            },
          },
        };
      });

      // 실시간 코드 동기화 발신
      if (client && connected) {
        client.publish({
          destination: '/pub/games/code/update',
          body: JSON.stringify({
            gameId: roomId,
            problemId: selectedProblemId,
            code,
            language: targetLanguage,
            isChangingLanguage: !!languageOverride, // 언어 변경 시에만 true
          }),
        });
      }
    },
    [selectedProblemId, currentLanguage, client, connected, roomId],
  );

  // 언어 설정
  const setLanguage = useCallback(
    (language: string) => {
      setCurrentLanguage(language);
      if (selectedProblemId) {
        setProblemCodes((prev) => {
          const problemState = prev[selectedProblemId] || { lastLanguage: language, codes: {} };
          return {
            ...prev,
            [selectedProblemId]: {
              ...problemState,
              lastLanguage: language,
            },
          };
        });
      }
    },
    [selectedProblemId],
  );

  // 메시지 전송
  const sendMessage = useCallback(
    (content: string) => {
      if (client && connected && gameState) {
        const myTeam = gameState.participants.find((p) => p.id === currentUserId)?.team;

        client.publish({
          destination: '/pub/games/chat',
          body: JSON.stringify({
            gameId: roomId,
            message: content,
            scope: 'GLOBAL', // [Fix] Use GLOBAL to allow frontend filtering
            teamColor: myTeam || null,
          }),
        });
      }
    },
    [client, connected, roomId, gameState, currentUserId],
  );

  // 코드 제출
  const submitCode = useCallback(() => {
    if (!selectedProblemId || !gameState) return;

    if (client && connected) {
      client.publish({
        destination: '/pub/games/submit',
        body: JSON.stringify({
          gameId: roomId,
          problemId: selectedProblemId,
          code: currentCode,
          language: currentLanguage,
        }),
      });
      toast.info('코드를 제출했습니다. 채점 중...');
    }
  }, [selectedProblemId, gameState, currentCode, currentLanguage, client, connected, roomId]);

  // 퇴장 처리 (잠시 나가기 - PLAYING/END 상태에서는 Redis 유지)
  const leaveRoom = useCallback(() => {
    // WebSocket 메시지 전송
    if (client && connected) {
      client.publish({
        destination: '/pub/games/leave',
        body: JSON.stringify({ gameId: roomId }),
      });
    }
    router.push('/game');
    toast.info('대기실로 이동합니다.');
  }, [client, connected, roomId, router]);

  // 게임 포기 처리 (포기하기 - 모든 상태에서 Redis 삭제)
  const forfeitGame = useCallback(() => {
    if (client && connected) {
      client.publish({
        destination: '/pub/games/forfeit',
        body: JSON.stringify({ gameId: roomId }),
      });
      toast.warning('게임을 포기했습니다.');
      router.push('/game');
    }
  }, [client, connected, roomId, router]);

  return {
    gameState,
    isLoading,
    selectedProblemId,
    selectedProblem,
    selectProblem,
    currentCode,
    currentLanguage,
    setCode,
    setLanguage,
    formattedTime,
    remainingTime: time,
    participants: gameState?.participants || [],
    currentUserId,
    messages,
    sendMessage,
    submitCode,
    leaveRoom,
    forfeitGame,
    onlineUserIds,
  };
}
