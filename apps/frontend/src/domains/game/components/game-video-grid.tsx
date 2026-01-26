'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GamePlayParticipant } from '@/domains/game/mocks/mock-data'
import { MicOff, VideoOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GameVideoGridProps {
    participants: GamePlayParticipant[]
    currentUserId: string
    className?: string
    micState?: Record<string, boolean>
    camState?: Record<string, boolean>
}

const PAGE_SIZE = 5

export function GameVideoGrid({
    participants,
    currentUserId,
    className,
    micState = {},
    camState = {},
}: GameVideoGridProps) {
    const [page, setPage] = useState(0)

    // 현재 사용자를 앞에 배치
    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.id === currentUserId) return -1
        if (b.id === currentUserId) return 1
        return 0
    })

    const totalPages = Math.ceil(sortedParticipants.length / PAGE_SIZE)
    const displayedParticipants = sortedParticipants.slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE
    )

    const handlePrev = () => {
        setPage((prev) => Math.max(0, prev - 1))
    }

    const handleNext = () => {
        setPage((prev) => Math.min(totalPages - 1, prev + 1))
    }

    return (
        <div className={cn('flex items-center border-b border-border bg-card px-2 py-3', className)}>
            {/* 이전 버튼 */}
            <div className="flex w-8 shrink-0 justify-center">
                {page > 0 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        onClick={handlePrev}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* 비디오 그리드 */}
            <div className="flex flex-1 justify-center gap-2 overflow-hidden px-4">
                {displayedParticipants.map((participant) => {
                    const isMicOff = micState[participant.id]
                    const isCamOff = camState[participant.id]
                    const isMe = participant.id === currentUserId
                    const isParticipantHost = participant.isHost

                    return (
                        <div
                            key={participant.id}
                            className={cn(
                                'relative flex h-24 w-32 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors',
                                isMe ? 'border-2 border-pink-500' : 'border', // 내 테두리는 핑크색 (팀 테두리보다 우선)
                                // 팀 배경색 및 테두리 (내 테두리가 우선이므로 배경색만 주로 적용됨, !isMe 제거)
                                participant.team === 'RED' && !isMe && 'border-red-300',
                                participant.team === 'BLUE' && !isMe && 'border-blue-300',
                                participant.team === 'RED' && 'bg-red-50/30',
                                participant.team === 'BLUE' && 'bg-blue-50/30',
                                !participant.team && 'bg-muted/50' // 개인전일 때
                            )}
                        >
                            {/* 아바타 또는 카메라 화면 */}
                            <div className="relative h-12 w-12">
                                <div className={cn(
                                    "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-white text-lg font-medium shadow-sm transition-opacity",
                                    isCamOff && "opacity-50 grayscale"
                                )}>
                                    {participant.nickname.charAt(0)}
                                </div>

                                {/* 상태 아이콘 오버레이 (모든 참여자에게 표시) */}
                                <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                                    {isMicOff && (
                                        <div className="rounded-full bg-destructive p-0.5 text-white shadow-sm" title="음소거됨">
                                            <MicOff className="h-2.5 w-2.5" />
                                        </div>
                                    )}
                                    {isCamOff && (
                                        <div className="rounded-full bg-gray-600 p-0.5 text-white shadow-sm" title="카메라 꺼짐">
                                            <VideoOff className="h-2.5 w-2.5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 닉네임 */}
                            <span className="mt-2 text-xs font-medium text-muted-foreground truncate max-w-[100px]">
                                {participant.nickname}
                            </span>

                            {/* 호스트 표시 (왕관만 표시) */}
                            {isParticipantHost && (
                                <div className="absolute top-1 right-1">
                                    <div className="text-yellow-500 drop-shadow-sm" title="방장">
                                        <div className="text-[10px]">👑</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* 다음 버튼 */}
            <div className="flex w-8 shrink-0 justify-center">
                {page < totalPages - 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
            </div>
        </div>
    )
}
