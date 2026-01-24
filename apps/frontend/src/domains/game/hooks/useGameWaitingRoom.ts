'use client'

import { useState, useCallback } from 'react'
import {
    getMockGameRoomDetail,
    getMockChatMessages,
    type ChatMessage,
    type GameRoomDetail,
    type Participant,
} from '@/domains/game/mocks/mock-data'

// 현재 사용자 ID (Mock - 실제로는 인증에서 가져옴)
// room 3에서 테스트하려면 user3 (레드팀 방장)
// room 2에서 개인전 준비 버튼 테스트하려면 user2 (일반 참여자)
const CURRENT_USER_ID = 'user2'

interface UseGameWaitingRoomReturn {
    room: GameRoomDetail | null
    messages: ChatMessage[]
    currentUserId: string
    isHost: boolean
    isReady: boolean
    inviteModalOpen: boolean
    isLoading: boolean
    setInviteModalOpen: (open: boolean) => void
    sendMessage: (content: string) => void
    toggleReady: () => void
    startGame: () => void
    leaveRoom: () => void
    kickParticipant: (participantId: string) => void
    changeTeam: () => void
}

export function useGameWaitingRoom(roomId: string): UseGameWaitingRoomReturn {
    // 방 정보 (Mock 데이터 사용)
    const [room, setRoom] = useState<GameRoomDetail | null>(() =>
        getMockGameRoomDetail(roomId)
    )
    const [messages, setMessages] = useState<ChatMessage[]>(() =>
        getMockChatMessages(roomId)
    )
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const currentUserId = CURRENT_USER_ID

    // 현재 사용자가 방장인지 확인
    const currentParticipant = room?.participants.find(
        (p) => p.id === currentUserId
    )
    const isHost = currentParticipant?.isHost ?? false
    const isReady = currentParticipant?.status === 'READY'

    // 메시지 전송 (팀 정보 포함)
    const sendMessage = useCallback((content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: currentUserId,
            senderNickname: currentParticipant?.nickname ?? '나',
            senderProfileImg: currentParticipant?.profileImg ?? '',
            content,
            timestamp: new Date().toISOString(),
            senderTeam: currentParticipant?.team, // 팀 정보 추가
        }
        setMessages((prev) => [...prev, newMessage])
    }, [currentUserId, currentParticipant])

    // 준비 토글
    const toggleReady = useCallback(() => {
        if (!room || isHost) return

        setRoom((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                participants: prev.participants.map((p) =>
                    p.id === currentUserId
                        ? { ...p, status: p.status === 'READY' ? 'NOT_READY' : 'READY' }
                        : p
                ),
            }
        })
    }, [room, isHost, currentUserId])

    // 게임 시작 (방장 전용)
    const startGame = useCallback(() => {
        if (!isHost) return
        // TODO: 실제 게임 시작 API 호출
        console.log('게임 시작!')
        // router.push(`/game/${roomId}/play`)
    }, [isHost])

    // 방 나가기
    const leaveRoom = useCallback(() => {
        // TODO: 실제 방 나가기 API 호출
        console.log('방 나가기')
        // router.push('/game')
    }, [])

    // 참여자 강퇴 (방장 전용)
    const kickParticipant = useCallback((participantId: string) => {
        if (!isHost || !room) return

        // TODO: 실제 강퇴 API 호출
        console.log('참여자 강퇴:', participantId)

        // Mock: 참여자 목록에서 제거
        setRoom((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                currentPlayers: prev.currentPlayers - 1,
                participants: prev.participants.filter((p) => p.id !== participantId),
            }
        })
    }, [isHost, room])

    // 팀 변경
    const changeTeam = useCallback(() => {
        if (!room || room.teamType !== 'TEAM' || !currentParticipant?.team) return

        const currentTeam = currentParticipant.team
        const targetTeam = currentTeam === 'RED' ? 'BLUE' : 'RED'
        const maxTeamPlayers = room.maxPlayers / 2

        const targetTeamCount = room.participants.filter(p => p.team === targetTeam).length

        // 빈 슬롯이 없으면 아무 동작 안 함
        if (targetTeamCount >= maxTeamPlayers) return

        setRoom((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                participants: prev.participants.map((p) =>
                    p.id === currentUserId
                        ? { ...p, team: targetTeam, status: 'NOT_READY' } // 팀 변경 시 준비 해제
                        : p
                ),
            }
        })
    }, [room, currentParticipant, currentUserId])

    return {
        room,
        messages,
        currentUserId,
        isHost,
        isReady,
        inviteModalOpen,
        isLoading,
        setInviteModalOpen,
        sendMessage,
        toggleReady,
        startGame,
        leaveRoom,
        kickParticipant,
        changeTeam,
    }
}
