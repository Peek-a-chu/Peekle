'use client'

import { useState, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GameModeCard } from '@/domains/game/components/game-mode-card'
import { GameRoomCard } from '@/domains/game/components/game-room-card'
import { PasswordModal } from '@/domains/game/components/password-modal'
import {
    gameModes,
    mockGameRooms,
    filterGameRooms,
    type GameRoom,
    type GameMode,
    type TeamType,
    type GameStatus,
} from '@/domains/game/mocks/mock-data'

type StatusFilter = GameStatus | 'ALL'

export default function GamesPage() {
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
    const [selectedTeamType, setSelectedTeamType] = useState<TeamType | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // 모달 상태
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null)

    const filteredRooms = useMemo(() => {
        return filterGameRooms(mockGameRooms, {
            mode: selectedMode || undefined,
            teamType: selectedTeamType || undefined,
            status: statusFilter,
            search: searchQuery,
        })
    }, [selectedMode, selectedTeamType, statusFilter, searchQuery])

    const handleModeSelect = (mode: GameMode, teamType: TeamType) => {
        if (selectedMode === mode && selectedTeamType === teamType) {
            // 이미 선택된 모드를 다시 클릭하면 선택 해제
            setSelectedMode(null)
            setSelectedTeamType(null)
        } else {
            setSelectedMode(mode)
            setSelectedTeamType(teamType)
        }
    }

    const handleRoomClick = (room: GameRoom) => {
        if (room.isPrivate) {
            // 비공개 방일 경우 비밀번호 모달 표시
            setSelectedRoom(room)
            setPasswordModalOpen(true)
        } else {
            // 공개 방일 경우 바로 입장
            console.log('Navigate to room:', room.id)
            // 실제로는 router.push(`/game/${room.id}`) 사용
        }
    }

    const handlePasswordSubmit = (password: string) => {
        // Mock: 비밀번호 검증 후 입장
        console.log('Entering room with password:', selectedRoom?.id, password)
        setPasswordModalOpen(false)
        // 실제로는 router.push(`/game/${selectedRoom?.id}`) 사용
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* 헤더 */}
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">게임 방</h1>
                    <Button
                        onClick={() => {
                            // TODO: 방 만들기 모달 구현 예정
                            console.log('방 만들기 버튼 클릭')
                        }}
                        className="bg-primary hover:bg-primary-hover"
                    >
                        <Plus className="mr-1 h-4 w-4" />방 만들기
                    </Button>
                </header>

                {/* 게임 모드 선택 카드 - 2x2 그리드 */}
                <section className="mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        {gameModes.map((mode) => (
                            <GameModeCard
                                key={`${mode.mode}-${mode.teamType}`}
                                mode={mode.mode}
                                teamType={mode.teamType}
                                title={mode.title}
                                description={mode.description}
                                isSelected={selectedMode === mode.mode && selectedTeamType === mode.teamType}
                                onClick={() => handleModeSelect(mode.mode, mode.teamType)}
                            />
                        ))}
                    </div>
                </section>

                {/* 검색바 */}
                <section className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="게임방 검색(제목, 태그..)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </section>

                {/* 필터 탭 */}
                <section className="mb-6">
                    <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <TabsList className="bg-muted/50 p-1 border border-border">
                            <TabsTrigger
                                value="ALL"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                            >전체</TabsTrigger>
                            <TabsTrigger
                                value="WAITING"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                            >대기 중</TabsTrigger>
                            <TabsTrigger
                                value="PLAYING"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                            >진행 중</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </section>

                {/* 게임방 목록 */}
                <section>
                    {filteredRooms.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {filteredRooms.map((room) => (
                                <GameRoomCard key={room.id} room={room} onClick={() => handleRoomClick(room)} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                            <p className="text-muted-foreground">검색 결과가 없습니다</p>
                            <Button
                                variant="link"
                                className="mt-2 text-primary"
                                onClick={() => {
                                    setSelectedMode(null)
                                    setSelectedTeamType(null)
                                    setStatusFilter('ALL')
                                    setSearchQuery('')
                                }}
                            >
                                필터 초기화
                            </Button>
                        </div>
                    )}
                </section>
            </div>

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
