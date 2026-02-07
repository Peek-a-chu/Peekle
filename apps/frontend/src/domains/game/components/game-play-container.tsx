'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useState, useEffect } from 'react';
import { useGamePlayRoom } from '@/domains/game/hooks/useGamePlayRoom';
import { GamePlayLayout } from '@/domains/game/layout/GamePlayLayout';
import { GameLiveKitWrapper } from '@/domains/game/components/GameLiveKitWrapper';
import { CCGameResultModal } from './game-result-modal/CCGameResultModal';
import { CCSpeedGameResultModal } from './game-result-modal/CCSpeedGameResultModal';

interface GamePlayContainerProps {
  roomId: string;
}

export function GamePlayContainer({ roomId }: GamePlayContainerProps) {
  const {
    gameState,
    isLoading,
    selectedProblemId,
    selectProblem,
    currentCode,
    currentLanguage,
    setCode,
    setLanguage,
    formattedTime,
    messages,
    participants,
    currentUserId,
    sendMessage,
    submitCode,
    leaveRoom,
    forfeitGame,
    onlineUserIds,
  } = useGamePlayRoom(roomId);

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMic = searchParams.get('mic') === 'true';
  const initialCam = searchParams.get('cam') === 'true';

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  useEffect(() => {
    if (gameState?.status === 'WAITING') {
      router.replace(`/game/${roomId}`);
    }
  }, [gameState?.status, roomId, router]);

  // 로딩 상태
  if (isLoading || !gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <p className="text-muted-foreground">게임을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 게임 화면 렌더링
  return (
    <>
      <GameLiveKitWrapper
        roomId={gameState.roomId}
        initialMicEnabled={initialMic}
        initialCamEnabled={initialCam}
      >
        <GamePlayLayout
          gameState={gameState}
          problems={gameState.problems}
          selectedProblemId={selectedProblemId}
          onSelectProblem={selectProblem}
          formattedTime={formattedTime}
          code={currentCode}
          language={currentLanguage}
          onCodeChange={setCode}
          onLanguageChange={setLanguage}
          onSubmit={submitCode}
          messages={messages}
          participants={participants}
          currentUserId={currentUserId}
          onSendMessage={sendMessage}
          onLeave={leaveRoom}
          onForfeit={forfeitGame}
          onlineUserIds={onlineUserIds}
        />
      </GameLiveKitWrapper>

      {/* [임시] 결과 모달 테스트 버튼 - mockGameResult가 정의되지 않아 주석 처리 */}
      {/* 
      <button
        onClick={() => setIsResultModalOpen(true)}
        className="fixed bottom-20 left-6 z-50 bg-primary/80 hover:bg-primary text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2"
      >
        <span className="text-base">🏁</span>
        결과 모달 테스트
      </button>
      */}

      {/* 게임 결과 모달 */}
      {isResultModalOpen && gameState?.result && (
        gameState.mode === 'SPEED_RACE' && gameState.teamType === 'INDIVIDUAL' ? (
          <CCSpeedGameResultModal
            isOpen={isResultModalOpen}
            onClose={() => setIsResultModalOpen(false)}
            data={null as any} // TODO: 실제 데이터 매핑 필요
          />
        ) : (
          <CCGameResultModal
            isOpen={isResultModalOpen}
            onClose={() => setIsResultModalOpen(false)}
            data={null as any} // TODO: 실제 데이터 매핑 필요
          />
        )
      )}
    </>
  );
}
