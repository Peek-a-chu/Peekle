'use client';

import { use, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGameWaitingRoom } from '@/domains/game/hooks/useGameWaitingRoom';
import { GameWaitingRoomLayout } from '@/domains/game/layout';
import { CCPreJoinModal } from '@/components/common/CCPreJoinModal';
import { getGameRoom, cancelRoomReservation } from '@/domains/game/api/game-api';
import { GameRoomDetail } from '@/domains/game/types/game-types';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function ConnectedGameWaitingRoom({
  roomId,
}: {
  roomId: string;
}) {
  const { isMicOn, isCamOn } = useSettingsStore();
  const {
    room,
    messages,
    currentUserId,
    isHost,
    isReady,
    isCountingDown,
    inviteModalOpen,
    setInviteModalOpen,
    sendMessage,
    toggleReady,
    startGame,
    onCountdownComplete,
    kickParticipant,
    changeTeam,
    isLoading,
  } = useGameWaitingRoom(roomId);

  const router = useRouter();

  useEffect(() => {
    if (room?.status === 'PLAYING') {
      router.replace(`/game/${roomId}/play`);
    }
  }, [room?.status, roomId, router]);

  if (isLoading || !room) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <p className="text-muted-foreground">방 입장을 준비 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <GameWaitingRoomLayout
      room={room}
      messages={messages}
      currentUserId={currentUserId}
      isHost={isHost}
      isReady={isReady}
      isCountingDown={isCountingDown}
      inviteModalOpen={inviteModalOpen}
      onInviteModalChange={setInviteModalOpen}
      onSendMessage={sendMessage}
      onReady={toggleReady}
      onCancelReady={toggleReady}
      onStartGame={startGame}
      onCountdownComplete={onCountdownComplete}
      onKickParticipant={kickParticipant}
      onChangeTeam={changeTeam}
    />
  );
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-Join State
  const preJoined = searchParams.get('prejoined') === 'true';
  const paramMic = searchParams.get('mic') === 'true';
  const paramCam = searchParams.get('cam') === 'true';

  const [isJoinedByPreJoin, setIsJoinedByPreJoin] = useState(preJoined);
  // initialMediaState removed (using global store)

  const [previewRoom, setPreviewRoom] = useState<GameRoomDetail | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(!preJoined);

  // Ref to track if we are intentionally joining, to prevent cancellation on unmount
  const isJoiningRef = useRef(false);

  useEffect(() => {
    // 이미 프리조인 상태(로비에서 진입)라면 미리보기 로딩 필요 없음
    if (preJoined) {
      isJoiningRef.current = true; // Mark as joining/joined so we don't cancel
      return;
    }

    const fetchPreview = async () => {
      try {
        const data = await getGameRoom(roomId);
        if (data) {
          setPreviewRoom(data);
        } else {
          // 방이 없거나 에러 시 로비로 이동
          router.replace('/game');
        }
      } catch (error) {
        console.error('Failed to fetch room preview:', error);
        router.replace('/game');
      } finally {
        setIsPreviewLoading(false);
      }
    };

    fetchPreview();

    // Cleanup: If component unmounts and we are NOT joining (e.g. refresh, back button, close tab), cancel reservation
    return () => {
      if (!isJoiningRef.current) {
        // Attempt to clean up reservation. 
        // Note: If browser is closing, this might not complete without keepalive, 
        // but apiFetch uses fetch which supports it if configured, or at least we try.
        cancelRoomReservation(roomId).catch(err => console.error(err));
      }
    };
  }, [roomId, preJoined, router]);

  const handleJoin = (mic: boolean, cam: boolean) => {
    isJoiningRef.current = true;
    // Media state is now handled by useSettingsStore in CCPreJoinModal
    setIsJoinedByPreJoin(true);
  };

  const handleCancel = async () => {
    // Explicit cancel button click
    try {
      await cancelRoomReservation(roomId);
    } catch (e) {
      console.error('Failed to cancel reservation:', e);
    } finally {
      window.location.href = '/game';
    }
  };

  // 1. 이미 입장 확인됨 (로비 등에서 옴) -> 바로 입장 처리 컴포넌트 렌더링
  // 2. 프리조인 모달을 통해 입장 -> 입장 처리 컴포넌트 렌더링
  if (isJoinedByPreJoin) {
    return <ConnectedGameWaitingRoom roomId={roomId} />;
  }

  // 3. 프리조인 단계: 로딩 중
  if (isPreviewLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <p className="text-muted-foreground">방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 4. 프리조인 단계: 모달 표시
  if (previewRoom) {
    return (
      <CCPreJoinModal
        roomTitle={previewRoom.title}
        description={`${previewRoom.mode === 'TIME_ATTACK' ? '타임어택' : '스피드'} 모드의 게임 대기방입니다.`}
        onJoin={handleJoin}
        onCancel={handleCancel}
        joinLabel="게임 입장"
      />
    );
  }

  return null;
}
