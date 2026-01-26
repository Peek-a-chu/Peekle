'use client'

import { use } from 'react'
import { useGamePlayRoom } from '@/domains/game/hooks/useGamePlayRoom'
import { GamePlayLayout } from '@/domains/game/layout/GamePlayLayout'

interface GamePlayPageProps {
    params: Promise<{
        roomId: string
    }>
}

export default function GamePlayPage({ params }: GamePlayPageProps) {
    const { roomId } = use(params)

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
    } = useGamePlayRoom(roomId)

    // 로딩 상태
    if (isLoading || !gameState) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mb-4 text-4xl">🎮</div>
                    <p className="text-muted-foreground">게임을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    return (
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
    )
}
