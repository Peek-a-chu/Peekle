'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Video, VideoOff, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ChatMessage, Participant } from '@/domains/game/types/game-types';

interface ChatPanelProps {
  messages: ChatMessage[];
  participants: Participant[];
  currentUserId: number;
  isHost: boolean;
  onSendMessage: (content: string) => void;
  onKickParticipant?: (participantId: number) => void;
  onMuteAll?: () => void;
  onTurnOffAllCams?: () => void;
  micState?: Record<string, boolean>;
  camState?: Record<string, boolean>;
  teamType?: 'INDIVIDUAL' | 'TEAM';
}

export function ChatPanel({
  messages,
  participants,
  currentUserId,
  isHost,
  onSendMessage,
  onKickParticipant, // Still keep the prop, but UI is different
  onMuteAll,
  onTurnOffAllCams,
  micState = {},
  camState = {},
  teamType = 'INDIVIDUAL',
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 유저의 팀 정보 찾기
  const myTeam = participants.find((p) => p.id === currentUserId)?.team;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        <TabsContent value="chat" className="m-0 flex flex-1 flex-col min-h-0">
          <CardContent className="flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              {messages
                .filter((msg) => {
                  // 팀전이면 내 팀 메시지만 표시 (시스템 메시지는 senderTeam이 없을 수 있음 - 일단 모두 표시하거나 별도 처리)
                  if (teamType === 'TEAM' && myTeam) {
                    // 메시지에 senderTeam이 있으면 내 팀과 비교
                    // 없으면(시스템 메시지 등) 일단 표시
                    return !msg.senderTeam || msg.senderTeam === myTeam;
                  }
                  return true;
                })
                .map((message) => {
                  const isMe = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {!isMe && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-xs font-medium text-white">
                          {(message.senderNickname || '?').charAt(0)}
                        </div>
                      )}
                      <div className={cn('max-w-[70%]', isMe ? 'text-right' : 'text-left')}>
                        {!isMe && (
                          <span className="mb-1 block text-xs text-muted-foreground">
                            {message.senderNickname}
                          </span>
                        )}
                        <div
                          className={cn(
                            'inline-block rounded-2xl px-3 py-2 text-sm',
                            isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground',
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

        <TabsContent value="participants" className="m-0 h-full overflow-y-auto">
          <CardContent className="p-3">
            <div className="space-y-1">
              {participants.map((participant) => {
                const id = participant.id;
                const isMicOn = micState[String(id)] ?? true;
                const isCamOn = camState[String(id)] ?? true;
                const pTeam = participant.team;

                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-sm font-medium text-white">
                        {participant.nickname.charAt(0)}
                      </div>
                      {/* 팀 뱃지 표시 */}
                      {teamType === 'TEAM' && pTeam && (
                        <div
                          className={cn(
                            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background',
                            pTeam === 'RED' ? 'bg-red-500' : 'bg-blue-500',
                          )}
                          title={`${pTeam} TEAM`}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{participant.nickname}</span>
                        {participant.isHost && <span className="text-xs text-yellow-500">👑</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {participant.isHost ? '방장' : '참여자'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isMicOn ? (
                        <Mic className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <MicOff className="h-4 w-4 text-destructive" />
                      )}
                      {isCamOn ? (
                        <Video className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <VideoOff className="h-4 w-4 text-destructive" />
                      )}
                      {isHost && participant.isHost && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-white dark:bg-zinc-950 p-1 shadow-lg text-popover-foreground"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={onMuteAll}
                              >
                                전체 음소거
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={onTurnOffAllCams}
                              >
                                전체 캠 끄기
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
