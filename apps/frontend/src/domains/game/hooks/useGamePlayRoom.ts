'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    GamePlayState,
    GameProblem,
    GamePlayParticipant,
    getMockGamePlayState,
    getMockChatMessages,
    ChatMessage,
} from '@/domains/game/mocks/mock-data'
import { useGameTimer } from './useGameTimer'

// 문제별 코드 상태
interface ProblemCodeState {
    [problemId: string]: {
        code: string
        language: string
    }
}

interface UseGamePlayRoomReturn {
    // 게임 상태
    gameState: GamePlayState | null
    isLoading: boolean

    // 선택된 문제
    selectedProblemId: string | null
    selectedProblem: GameProblem | null
    selectProblem: (problemId: string) => void

    // 코드 상태
    currentCode: string
    currentLanguage: string
    setCode: (code: string) => void
    setLanguage: (language: string) => void

    // 타이머
    formattedTime: string
    remainingTime: number

    // 참여자
    participants: GamePlayParticipant[]
    currentUserId: string

    // 채팅
    messages: ChatMessage[]
    sendMessage: (content: string) => void

    // 액션
    submitCode: () => Promise<void>
}

const DEFAULT_CODE: Record<string, string> = {
    python: `# Enter your Python code here\nprint("Hello, World!")`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
}

export function useGamePlayRoom(roomId: string): UseGamePlayRoomReturn {
    const [gameState, setGameState] = useState<GamePlayState | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null)
    const [problemCodes, setProblemCodes] = useState<ProblemCodeState>({})
    const [currentLanguage, setCurrentLanguage] = useState('python')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [currentUserId, setCurrentUserId] = useState('user1')

    // 게임 상태 로드
    useEffect(() => {
        setIsLoading(true)
        // Mock 데이터 로드 (실제로는 API 호출)
        const state = getMockGamePlayState(roomId)
        if (state) {
            setGameState(state)
            // 첫 번째 문제 선택
            if (state.problems.length > 0) {
                setSelectedProblemId(state.problems[0].id)
            }
            // Mock: 테스트를 위해 접속 시 항상 방장 권한을 갖도록 설정
            const host = state.participants.find(p => p.isHost)
            if (host) {
                setCurrentUserId(host.id)
            }
        }
        setMessages(getMockChatMessages(roomId))
        setIsLoading(false)
    }, [roomId])

    // 타이머 설정
    const isSpeedRace = gameState?.mode === 'SPEED_RACE'
    const timerInitialTime = isSpeedRace ? 0 : (gameState?.remainingTime ?? 1800)

    const { formattedTime, time } = useGameTimer({
        initialTime: timerInitialTime,
        mode: isSpeedRace ? 'countup' : 'countdown',
        autoStart: gameState !== null,
        onTimeUp: () => {
            console.log('시간 종료!')
        },
    })

    // 선택된 문제
    const selectedProblem = gameState?.problems.find((p) => p.id === selectedProblemId) ?? null

    // 현재 코드
    const currentCode = problemCodes[selectedProblemId ?? '']?.code ?? DEFAULT_CODE[currentLanguage]

    // 문제 선택
    const selectProblem = useCallback((problemId: string) => {
        setSelectedProblemId(problemId)
    }, [])

    // 코드 설정
    const setCode = useCallback((code: string) => {
        if (!selectedProblemId) return
        setProblemCodes((prev) => ({
            ...prev,
            [selectedProblemId]: {
                code,
                language: currentLanguage,
            },
        }))
    }, [selectedProblemId, currentLanguage])

    // 언어 설정
    const setLanguage = useCallback((language: string) => {
        setCurrentLanguage(language)
        if (selectedProblemId) {
            setProblemCodes((prev) => ({
                ...prev,
                [selectedProblemId]: {
                    code: prev[selectedProblemId]?.code ?? DEFAULT_CODE[language],
                    language,
                },
            }))
        }
    }, [selectedProblemId])

    // 메시지 전송
    const sendMessage = useCallback((content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: currentUserId,
            senderNickname: '나',
            senderProfileImg: '/avatars/default.png',
            content,
            timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, newMessage])
    }, [currentUserId])

    // 코드 제출
    const submitCode = useCallback(async () => {
        if (!selectedProblemId || !gameState) return

        // Mock: 제출 성공 시뮬레이션
        console.log('코드 제출:', {
            problemId: selectedProblemId,
            code: currentCode,
            language: currentLanguage,
        })

        // TODO: 실제 API 호출 및 결과 처리
    }, [selectedProblemId, gameState, currentCode, currentLanguage])

    return {
        gameState,
        isLoading,
        selectedProblemId,
        selectedProblem,
        selectProblem,
        currentCode,
        currentLanguage,
        setCode,
        setLanguage,
        formattedTime,
        remainingTime: time,
        participants: gameState?.participants ?? [],
        currentUserId,
        messages,
        sendMessage,
        submitCode,
    }
}
