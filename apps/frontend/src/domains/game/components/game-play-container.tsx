'use client';

import { useState } from 'react';
import { useGamePlayRoom } from '@/domains/game/hooks/useGamePlayRoom';
import { GamePlayLayout } from '@/domains/game/layout/GamePlayLayout';
import { CCGameResultModal } from './game-result-modal/CCGameResultModal';
import { mockGameResult } from '../mocks/resultMock';

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
  } = useGamePlayRoom(roomId);

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

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
      />

      {/* [임시] 결과 모달 테스트 버튼 */}
      <button
        onClick={() => setIsResultModalOpen(true)}
        className="fixed bottom-20 left-6 z-50 bg-primary/80 hover:bg-primary text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2"
      >
        <span className="text-base">🏁</span>
        결과 모달 테스트
      </button>

      {/* 게임 결과 모달 */}
      <CCGameResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        data={mockGameResult}
      />
    </>
  );
}
