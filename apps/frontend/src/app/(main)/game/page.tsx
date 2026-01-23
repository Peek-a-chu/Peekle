'use client'

import { GameCreationModal } from '@/domains/game/components/game-creation-modal'
import { PasswordModal } from '@/domains/game/components/password-modal'
import { useGamePageLogic } from '@/domains/game/hooks/useGamePageLogic'
import {
    GameLayoutHeader,
    GameLayoutFilter,
    GameLayoutContent
} from '@/domains/game/layout'

export default function GamesPage() {
    const {
        selectedMode,
        selectedTeamType,
        statusFilter,
        searchQuery,
        passwordModalOpen,
        selectedRoom,
        createModalOpen,
        filteredRooms,
        setCreateModalOpen,
        setPasswordModalOpen,
        // setSelectedRoom, // Not directly used in JSX
        setSearchQuery,
        setStatusFilter,
        handleModeSelect,
        handleRoomClick,
        handlePasswordSubmit,
        resetFilters,
    } = useGamePageLogic()

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* 헤더 */}
                <GameLayoutHeader onCreateClick={() => setCreateModalOpen(true)} />

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

            {/* 게임 생성 모달 */}
            <GameCreationModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onSubmit={(formData) => {
                    console.log('게임 생성 완료:', formData)
                    // TODO: 실제로는 생성된 방으로 이동
                }}
            />

            {/* 비밀번호 입력 모달 */}
            <PasswordModal
                open={passwordModalOpen}
                onOpenChange={setPasswordModalOpen}
                roomTitle={selectedRoom?.title || ''}
                onSubmit={handlePasswordSubmit}
            />
        </div>
    )
}
