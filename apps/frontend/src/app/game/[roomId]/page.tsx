'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useGameWaitingRoom } from '@/domains/game/hooks/useGameWaitingRoom';
import { GameWaitingRoomLayout } from '@/domains/game/layout';
import { CCPreJoinModal } from '@/components/common/CCPreJoinModal';

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();

  // Pre-Join State
  const preJoined = searchParams.get('prejoined') === 'true';
  const paramMic = searchParams.get('mic') === 'true';
  const paramCam = searchParams.get('cam') === 'true';

  const [isJoinedByPreJoin, setIsJoinedByPreJoin] = useState(preJoined);
  const [initialMediaState, setInitialMediaState] = useState({
    mic: preJoined ? paramMic : false,
    cam: preJoined ? paramCam : true,
  });

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
  } = useGameWaitingRoom(roomId);

  const handleJoin = (mic: boolean, cam: boolean) => {
    setInitialMediaState({ mic, cam });
    setIsJoinedByPreJoin(true);
  };

  const handleCancel = () => {
    window.location.href = '/game';
  };

  // 로딩 상태
  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <p className="text-muted-foreground">방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isJoinedByPreJoin) {
    return (
      <CCPreJoinModal
        roomTitle={room.title}
        description={`${room.mode === 'TIME_ATTACK' ? '타임어택' : '스피드'} 모드의 게임 대기방입니다.`}
        onJoin={handleJoin}
        onCancel={handleCancel}
      />
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
