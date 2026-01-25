'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, UserMinus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { ChatMessage, Participant } from '@/domains/game/mocks/mock-data'

interface ChatPanelProps {
    messages: ChatMessage[]
    participants: Participant[]
    currentUserId: string
    isHost: boolean
    onSendMessage: (content: string) => void
    onKickParticipant?: (participantId: string) => void
}

export function ChatPanel({
    messages,
    participants,
    currentUserId,
    isHost,
    onSendMessage,
    onKickParticipant,
}: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('')
    const [kickTarget, setKickTarget] = useState<Participant | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 새 메시지가 오면 스크롤 맨 아래로
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim())
            setInputValue('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleKickConfirm = () => {
        if (kickTarget && onKickParticipant) {
            onKickParticipant(kickTarget.id)
        }
        setKickTarget(null)
    }

    return (
        <>
            <Card className="flex h-full flex-col border-border bg-card">
                <Tabs defaultValue="chat" className="flex h-full flex-col">
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b bg-transparent p-0">
                        <TabsTrigger
                            value="chat"
                            className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            채팅
                        </TabsTrigger>
                        <TabsTrigger
                            value="participants"
                            className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            참여자 ({participants.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* 채팅 탭 */}
                    <TabsContent value="chat" className="m-0 flex flex-1 flex-col">
                        <CardContent className="flex-1 overflow-y-auto p-3">
                            <div className="space-y-3">
                                {messages.map((message) => {
                                    const isMe = message.senderId === currentUserId
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                'flex gap-2',
                                                isMe ? 'flex-row-reverse' : 'flex-row'
                                            )}
                                        >
                                            {/* 아바타 (나가 아닐 때만) */}
                                            {!isMe && (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-xs font-medium text-white">
                                                    {message.senderNickname.charAt(0)}
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'max-w-[70%]',
                                                    isMe ? 'text-right' : 'text-left'
                                                )}
                                            >
                                                {!isMe && (
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        {message.senderNickname}
                                                    </span>
                                                )}
                                                <div
                                                    className={cn(
                                                        'inline-block rounded-2xl px-3 py-2 text-sm',
                                                        isMe
                                                            ? message.senderTeam === 'RED'
                                                                ? 'bg-red-500 text-white'
                                                                : message.senderTeam === 'BLUE'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-primary text-primary-foreground'
                                                            : message.senderTeam === 'RED'
                                                                ? 'bg-red-100 text-red-900'
                                                                : message.senderTeam === 'BLUE'
                                                                    ? 'bg-blue-100 text-blue-900'
                                                                    : 'bg-muted text-foreground'
                                                    )}
                                                >
                                                    {message.content}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        </CardContent>

                        {/* 입력창 */}
                        <div className="border-t p-3">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="메시지 입력..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!inputValue.trim()}
                                    className="shrink-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 참여자 탭 */}
                    <TabsContent value="participants" className="m-0 h-full overflow-y-auto">
                        <CardContent className="p-3">
                            {/* 참여자 목록 */}
                            <div className="space-y-1">
                                {participants.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-sm font-medium text-white">
                                            {participant.nickname.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {participant.nickname}
                                                </span>
                                                {participant.isHost && (
                                                    <span className="text-xs text-yellow-500">👑</span>
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-xs',
                                                    participant.status === 'READY'
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground'
                                                )}
                                            >
                                                {participant.isHost
                                                    ? '방장'
                                                    : participant.status === 'READY'
                                                        ? '준비 완료'
                                                        : '준비 대기'}
                                            </span>
                                        </div>
                                        {/* 강퇴 버튼 (방장만, 자신 제외) */}
                                        {isHost && !participant.isHost && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setKickTarget(participant)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* 강퇴 확인 모달 */}
            <AlertDialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>참여자 강퇴</AlertDialogTitle>
                        <AlertDialogDescription>
                            {kickTarget?.nickname}을/를 강퇴하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>아니오</AlertDialogCancel>
                        <AlertDialogAction onClick={handleKickConfirm}>
                            예
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
