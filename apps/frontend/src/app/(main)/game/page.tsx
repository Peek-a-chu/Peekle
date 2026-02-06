'use client';

import { GameCreationModal } from '@/domains/game/components/game-creation-modal';
import { PasswordModal } from '@/domains/game/components/password-modal';
import { InviteCodeJoinModal } from '@/domains/game/components/invite-code-join-modal';
import { GameReconnectModal } from '@/domains/game/components/game-reconnect-modal';
import { useGamePageLogic } from '@/domains/game/hooks/useGamePageLogic';
import { useCurrentGame } from '@/domains/game/hooks/useCurrentGame';
import { GameLayoutHeader, GameLayoutFilter, GameLayoutContent } from '@/domains/game/layout';
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
    inviteJoinModalOpen,
    filteredRooms,
    isCreatingRoom,
    setCreateModalOpen,
    setPasswordModalOpen,
    setInviteJoinModalOpen,
    // setSelectedRoom, // Not directly used in JSX
    setSearchQuery,
    setStatusFilter,
    handleModeSelect,
    handleRoomClick,
    handlePasswordSubmit,
    handleInviteCodeJoin,
    handleCreateRoom,
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
            onJoinWithCodeClick={() => setInviteJoinModalOpen(true)}
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

      {/* 참여 코드로 입장 모달 */}
      <InviteCodeJoinModal
        open={inviteJoinModalOpen}
        onOpenChange={setInviteJoinModalOpen}
        onSubmit={handleInviteCodeJoin}
      />
    </>
  );
}
