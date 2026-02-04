'use client';

import { use } from 'react';
import { useGameWaitingRoom } from '@/domains/game/hooks/useGameWaitingRoom';
import { GameWaitingRoomLayout } from '@/domains/game/layout';

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const { roomId } = use(params);

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
