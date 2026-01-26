'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GamePlayHeader } from '@/domains/game/components/game-play-header'
import { GameProblemListPanel } from '@/domains/game/components/game-problem-list-panel'
import { GamePlayCenterPanel } from '@/domains/game/components/game-play-center-panel'
import { ChatPanel } from '@/domains/game/components/chat-panel'
import { GameControlBar } from '@/domains/game/components/game-control-bar'
import {
    GamePlayState,
    GameProblem,
    GamePlayParticipant,
    ChatMessage
} from '@/domains/game/mocks/mock-data'

interface GamePlayLayoutProps {
    className?: string
    gameState: GamePlayState
    problems: GameProblem[]
    selectedProblemId: string | null
    onSelectProblem: (problemId: string) => void
    formattedTime: string
    code: string
    language: string
    onCodeChange: (code: string) => void
    onLanguageChange: (language: string) => void
    onSubmit: () => Promise<void>
    messages: ChatMessage[]
    participants: GamePlayParticipant[]
    currentUserId: string
    onSendMessage: (content: string) => void
}

export function GamePlayLayout({
    className,
    gameState,
    problems,
    selectedProblemId,
    onSelectProblem,
    formattedTime,
    code,
    language,
    onCodeChange,
    onLanguageChange,
    onSubmit,
    messages,
    participants,
    currentUserId,
    onSendMessage,
}: GamePlayLayoutProps) {
    const [isLeftPanelFolded, setIsLeftPanelFolded] = useState(false)
    const [isRightPanelFolded, setIsRightPanelFolded] = useState(false)

    // 미디어 상태 관리 (Mock)
    const [micState, setMicState] = useState<Record<string, boolean>>({})
    const [camState, setCamState] = useState<Record<string, boolean>>({})

    const handleMuteAll = () => {
        const newState: Record<string, boolean> = {}
        participants.forEach((p) => (newState[p.id] = true))
        setMicState((prev) => ({ ...prev, ...newState }))
    }

    const handleTurnOffAllCams = () => {
        const newState: Record<string, boolean> = {}
        participants.forEach((p) => (newState[p.id] = true))
        setCamState((prev) => ({ ...prev, ...newState }))
    }

    const handleMyMicToggle = () => {
        setMicState(prev => ({
            ...prev,
            [currentUserId]: !prev[currentUserId]
        }))
    }

    const handleMyVideoToggle = () => {
        setCamState(prev => ({
            ...prev,
            [currentUserId]: !prev[currentUserId]
        }))
    }

    return (
        <div className={cn('flex h-screen flex-col bg-background', className)}>
            {/* 헤더 */}
            <GamePlayHeader
                title={gameState.title}
                mode={gameState.mode}
                teamType={gameState.teamType}
                formattedTime={formattedTime}
                scores={gameState.scores}
            />

            {/* 메인 콘텐츠 */}
            <div className="flex flex-1 min-h-0">
                {/* 좌측: 문제 목록 */}
                <div
                    className={cn(
                        'shrink-0 border-r border-border transition-all duration-300',
                        isLeftPanelFolded ? 'w-12' : 'w-64'
                    )}
                >
                    <GameProblemListPanel
                        problems={problems}
                        selectedProblemId={selectedProblemId}
                        onSelectProblem={onSelectProblem}
                        mode={gameState.mode}
                        teamType={gameState.teamType}
                        participants={participants}
                        isFolded={isLeftPanelFolded}
                        onToggleFold={() => setIsLeftPanelFolded((prev) => !prev)}
                    />
                </div>

                {/* 중앙: IDE */}
                <div className="flex-1 min-w-0">
                    <GamePlayCenterPanel
                        code={code}
                        language={language}
                        participants={participants}
                        currentUserId={currentUserId}
                        onCodeChange={onCodeChange}
                        onLanguageChange={onLanguageChange}
                        onSubmit={onSubmit}
                        selectedProblemUrl={problems.find(p => p.id === selectedProblemId) ? `https://www.acmicpc.net/problem/${problems.find(p => p.id === selectedProblemId)!.problemNumber.replace('#', '')}` : undefined}
                        micState={micState}
                        camState={camState}
                    />
                </div>

                {/* 우측: 채팅 패널 */}
                <div
                    className={cn(
                        'shrink-0 border-l border-border transition-all duration-300',
                        isRightPanelFolded ? 'w-12' : 'w-80'
                    )}
                >
                    {isRightPanelFolded ? (
                        <div className="flex h-full flex-col items-center py-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsRightPanelFolded(false)}
                                className="h-8 w-8"
                                title="채팅 패널 펼치기"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col">
                            {/* 패널 헤더 */}
                            <div className="flex h-10 shrink-0 items-center border-b border-border bg-card px-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsRightPanelFolded(true)}
                                    className="h-8 w-8"
                                    title="패널 접기"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            {/* 채팅 패널 */}
                            <div className="flex-1 min-h-0">
                                <ChatPanel
                                    messages={messages}
                                    participants={participants}
                                    currentUserId={currentUserId}
                                    isHost={participants.find(p => p.id === currentUserId)?.isHost || false}
                                    onSendMessage={onSendMessage}
                                    onMuteAll={handleMuteAll}
                                    onTurnOffAllCams={handleTurnOffAllCams}
                                    micState={micState}
                                    camState={camState}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 하단 미디어 컨트롤 바 */}
            <GameControlBar
                className="border-t border-border bg-card py-2"
                isMuted={micState[currentUserId] || false}
                isVideoOff={camState[currentUserId] || false}
                onMicToggle={handleMyMicToggle}
                onVideoToggle={handleMyVideoToggle}
                onSettingsClick={() => { console.log('Settings clicked') }}
            />
        </div>
    )
}
