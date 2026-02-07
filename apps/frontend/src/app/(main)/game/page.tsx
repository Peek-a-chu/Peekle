'use client';

import { GameCreationModal } from '@/domains/game/components/game-creation-modal';
import { PasswordModal } from '@/domains/game/components/password-modal';
import { GameReconnectModal } from '@/domains/game/components/game-reconnect-modal';
import { useGamePageLogic } from '@/domains/game/hooks/useGamePageLogic';
import { useCurrentGame } from '@/domains/game/hooks/useCurrentGame';
import { GameLayoutHeader, GameLayoutFilter, GameLayoutContent } from '@/domains/game/layout';
import { CCPreJoinModal } from '@/components/common/CCPreJoinModal';
import { useEffect, useState } from 'react';

export default function GamesPage(): React.ReactNode {
  const {
    selectedMode,
    selectedTeamType,
    statusFilter,
    searchQuery,
    passwordModalOpen,
    selectedRoom,
    createModalOpen,
    filteredRooms,
    isCreatingRoom,
    setCreateModalOpen,
    setPasswordModalOpen,
    // setSelectedRoom, // Not directly used in JSX
    setSearchQuery,
    setStatusFilter,
    handleModeSelect,
    handleRoomClick,
    handlePasswordSubmit,
    handleCreateRoom,
    // PreJoin related
    showPreJoinModal,
    setShowPreJoinModal,
    creationFormData,
    handleFinalCreateRoom,
    resetFilters,
  } = useGamePageLogic();

  // 재접속 모달 로직
  const { data: currentGame, isLoading } = useCurrentGame();
  const [showReconnectModal, setShowReconnectModal] = useState(false);

  useEffect(() => {
    // PLAYING 또는 END 상태의 게임이 있으면 모달 표시
    if (!isLoading && currentGame && (currentGame.status === 'PLAYING' || currentGame.status === 'END')) {
      setShowReconnectModal(true);
    }
  }, [currentGame, isLoading]);

  return (
    <>
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* 헤더 */}
          <GameLayoutHeader
            onCreateClick={() => setCreateModalOpen(true)}
          />

          {/* 필터 섹션 (모드 선택, 검색, 상태 탭) */}
          <GameLayoutFilter
            selectedMode={selectedMode}
            selectedTeamType={selectedTeamType}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onModeSelect={handleModeSelect}
            onSearchChange={setSearchQuery}
            onStatusChange={setStatusFilter}
          />

          {/* 게임방 목록 */}
          <GameLayoutContent
            rooms={filteredRooms}
            onRoomClick={handleRoomClick}
            onResetFilters={resetFilters}
            searchQuery={searchQuery}
            selectedMode={selectedMode}
            statusFilter={statusFilter}
          />
        </div>
      </div>

      {/* 재접속 모달 - fixed로 전체 화면 가림 */}
      {currentGame && showReconnectModal && (
        <div className="fixed inset-0 ml-[240px] z-[100]">
          <GameReconnectModal
            isOpen={showReconnectModal}
            onClose={() => setShowReconnectModal(false)}
            gameId={currentGame.roomId}
            status={currentGame.status as 'PLAYING' | 'END'}
            title={currentGame.title}
          />
        </div>
      )}

      {/* 게임 생성 모달 */}
      <GameCreationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateRoom}
        isLoading={isCreatingRoom}
      />

      {/* 비밀번호 입력 모달 */}
      <PasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        roomTitle={selectedRoom?.title || ''}
        onSubmit={handlePasswordSubmit}
      />

      {/* 방 생성 전 프리조인 모달 */}
      {showPreJoinModal && creationFormData && (
        <CCPreJoinModal
          roomTitle={creationFormData.title}
          description="방 생성 전, 카메라와 마이크를 확인해주세요."
          onJoin={handleFinalCreateRoom}
          onCancel={() => setShowPreJoinModal(false)}
          joinLabel="방 생성하기"
          isLoading={isCreatingRoom}
        />
      )}


    </>
  );
}
