import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    mockGameRooms,
    filterGameRooms,
    type GameRoom,
    type GameMode,
    type TeamType,
    type GameStatus,
} from '@/domains/game/mocks/mock-data'

export type StatusFilter = GameStatus | 'ALL'

export function useGamePageLogic() {
    const router = useRouter()

    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
    const [selectedTeamType, setSelectedTeamType] = useState<TeamType | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // 모달 상태
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null)
    const [createModalOpen, setCreateModalOpen] = useState(false)

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
        // 진행 중인 방은 입장 불가
        if (room.status === 'PLAYING') {
            toast.error('진행 중인 방에는 입장할 수 없습니다')
            return
        }

        if (room.isPrivate) {
            // 비공개 방일 경우 비밀번호 모달 표시
            setSelectedRoom(room)
            setPasswordModalOpen(true)
        } else {
            // 공개 방일 경우 바로 대기방으로 이동
            router.push(`/game/${room.id}`)
        }
    }

    const handlePasswordSubmit = (password: string) => {
        // TODO: 비밀번호 검증 API 호출
        console.log('Entering room with password:', selectedRoom?.id, password)
        setPasswordModalOpen(false)
        // 비밀번호 검증 후 대기방으로 이동
        if (selectedRoom) {
            router.push(`/game/${selectedRoom.id}`)
        }
    }

    const resetFilters = () => {
        setSelectedMode(null)
        setSelectedTeamType(null)
        setStatusFilter('ALL')
        setSearchQuery('')
    }

    return {
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
        setSelectedRoom,
        setSearchQuery,
        setStatusFilter,
        handleModeSelect,
        handleRoomClick,
        handlePasswordSubmit,
        resetFilters,
    }
}
