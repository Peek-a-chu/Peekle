'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Check, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessage, Participant, TeamType } from '@/domains/game/types/game-types';

interface GameChatPanelProps {
    messages: ChatMessage[];
    participants: Participant[];
    currentUserId: number;
    isHost: boolean;
    onSendMessage: (content: string) => void;
    teamType?: TeamType;
}

export function GameChatPanel({
    messages,
    participants,
    currentUserId,
    onSendMessage,
    teamType = 'INDIVIDUAL',
}: GameChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 현재 유저의 팀 정보 찾기
    const myTeam = participants.find((p) => p.id === currentUserId)?.team;

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
        <div className="flex h-full flex-col bg-card">
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
                <div className="space-y-3">
                    {messages
                        .filter((msg) => {
                            // 팀전이면 내 팀 메시지 + 시스템 메시지만 표시
                            // 시스템 메시지: senderTeam이 undefined일 수 있음 (서버 구현에 따라 다름)
                            // 여기서는 senderTeam이 있으면 내 팀과 비교, 없으면(전체/시스템) 표시
                            if (teamType === 'TEAM' && myTeam && msg.senderTeam) {
                                return msg.senderTeam === myTeam;
                            }
                            return true;
                        })
                        .map((message) => {
                            const isMe = message.senderId === currentUserId;
                            // 시스템 메시지 처리 가능 (type check)
                            const isSystem = message.type === 'SYSTEM';

                            if (isSystem) {
                                return (
                                    <div key={message.id} className="flex justify-center my-2">
                                        <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                                            {message.content}
                                        </span>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={message.id}
                                    className={cn(
                                        'flex flex-col mb-4 group max-w-[85%] transition-all duration-300',
                                        isMe ? 'self-end items-end' : 'self-start items-start'
                                    )}
                                >
                                    {!isMe && (
                                        <span className="text-xs text-muted-foreground mb-1 ml-1">
                                            {message.senderNickname}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2 max-w-full">
                                        <div
                                            className={cn(
                                                'text-sm break-all px-3 py-2 rounded-2xl shadow-sm',
                                                isMe
                                                    ? 'bg-primary text-primary-foreground rounded-tr-md'
                                                    : 'bg-muted text-foreground rounded-tl-md'
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
            </div>

            <div className="min-h-[3.5rem] px-3 py-2 border-t bg-background flex flex-col justify-center">
                <div className="flex gap-2">
                    <Input
                        placeholder={teamType === 'TEAM' ? "팀원에게 메시지 보내기..." : "메시지 입력..."}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-muted/50 border-input/50 focus:bg-background transition-colors"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className="shrink-0 shadow-sm"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
