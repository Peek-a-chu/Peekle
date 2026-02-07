'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, UserMinus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserIcon } from '@/components/UserIcon';
import type { ChatMessage, Participant } from '@/domains/game/types/game-types';

interface WaitingRoomChatPanelProps {
    messages: ChatMessage[];
    participants: Participant[];
    currentUserId: number;
    isHost: boolean;
    onSendMessage: (content: string) => void;
    onKickParticipant: (participantId: number) => void;
}

export function WaitingRoomChatPanel({
    messages,
    participants,
    currentUserId,
    isHost,
    onSendMessage,
    onKickParticipant,
}: WaitingRoomChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [kickTarget, setKickTarget] = useState<Participant | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 대기실 전체 채팅 표시 (팀 필터링 제거)

    // 새 메시지가 오면 스크롤 맨 아래로
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
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
                <TabsContent value="chat" className="m-0 flex flex-1 flex-col min-h-0">
                    <CardContent className="flex-1 overflow-y-auto p-3">
                        <div className="space-y-3">
                            {messages.map((message) => {
                                // 시스템 메시지 렌더링
                                if (message.type === 'SYSTEM') {
                                    return (
                                        <div key={message.id} className="flex justify-center py-1">
                                            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                                                {message.content}
                                            </div>
                                        </div>
                                    );
                                }

                                // 일반 메시지 렌더링
                                const isMe = message.senderId === currentUserId;
                                return (
                                    <div
                                        key={message.id}
                                        className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                                    >
                                        {!isMe && (
                                            <UserIcon
                                                src={message.profileImg}
                                                nickname={message.senderNickname}
                                                size={32}
                                                className="shrink-0"
                                            />
                                        )}
                                        <div className={cn('max-w-[70%]', isMe ? 'text-right' : 'text-left')}>
                                            {!isMe && (
                                                <span className="mb-1 block text-xs text-muted-foreground">
                                                    {message.senderNickname}
                                                </span>
                                            )}
                                            <div
                                                className={cn(
                                                    'inline-block rounded-2xl px-3 py-2 text-sm text-foreground',
                                                    isMe ? 'bg-primary text-primary-foreground' : 'bg-muted',
                                                )}
                                            >
                                                {message.content}
                                            </div>
                                        </div>
                                    </div>
                                );
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
                        <div className="space-y-1">
                            {participants.map((participant) => {
                                const isMe = participant.id === currentUserId;
                                const canKick = isHost && !participant.isHost;

                                return (
                                    <div
                                        key={participant.id}
                                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                                    >
                                        {/* 아바타 */}
                                        <UserIcon
                                            src={participant.profileImg}
                                            nickname={participant.nickname}
                                            size={40}
                                            className="shrink-0"
                                        />

                                        {/* 이름 및 상태 */}
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-semibold">{participant.nickname}</span>
                                                {participant.isHost && <span className="text-xs text-yellow-500">👑</span>}
                                                {isMe && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">나</span>}
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-[11px] font-medium',
                                                    participant.isHost ? 'text-amber-500' :
                                                        participant.status === 'READY' ? 'text-emerald-500' : 'text-muted-foreground',
                                                )}
                                            >
                                                {participant.isHost
                                                    ? '방장'
                                                    : participant.status === 'READY'
                                                        ? '준비 완료'
                                                        : '준비 대기'}
                                            </span>
                                        </div>

                                        {/* 강퇴 버튼 (방장 전용, 자신 제외) */}
                                        {canKick && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                                                title="강퇴하기"
                                                onClick={() => setKickTarget(participant)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </TabsContent>
            </Tabs>

            {/* 강퇴 확인 모달 */}
            <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">참여자 강퇴</AlertDialogTitle>
                        <AlertDialogDescription>
                            정말로 <strong>{kickTarget?.nickname}</strong> 님을 이 방에서 강퇴하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (kickTarget) {
                                    onKickParticipant(kickTarget.id);
                                    setKickTarget(null);
                                }
                            }}
                        >
                            강퇴하기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
