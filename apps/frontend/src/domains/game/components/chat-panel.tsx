'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Video, VideoOff, MoreVertical, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ChatMessage, Participant } from '@/domains/game/mocks/mock-data';

const PreBlock = ({ children, ...props }: any) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (preRef.current) {
      const codeText = preRef.current.innerText || '';
      navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="relative my-2 overflow-hidden rounded-md bg-zinc-950/90 border border-white/10 text-left">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-white/10"
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre
        ref={preRef}
        className="overflow-x-auto p-4 font-mono text-xs text-zinc-50"
        {...props}
      >
        {children}
      </pre>
    </div>
  );
};

interface ChatPanelProps {
  messages: ChatMessage[];
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onSendMessage: (content: string) => void;
  onKickParticipant?: (participantId: string) => void;
  onMuteAll?: () => void;
  onTurnOffAllCams?: () => void;
  micState?: Record<string, boolean>;
  camState?: Record<string, boolean>;
}

export function ChatPanel({
  messages,
  participants,
  currentUserId,
  isHost,
  onSendMessage,
  onMuteAll,
  onTurnOffAllCams,
  micState = {},
  camState = {},
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 현재 사용자의 팀 확인
  const myTeam = participants.find((p) => p.id === currentUserId)?.team;

  // 메시지 필터링 (팀전일 경우 우리 팀 메시지만)
  const filteredMessages = messages.filter((msg) => {
    if (!myTeam) return true; // 개인전이면 모두 표시
    // 시스템 메시지(team 없음)거나 같은 팀 메시지만 표시
    return !msg.senderTeam || msg.senderTeam === myTeam;
  });

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
              {filteredMessages.map((message) => {
                const isMe = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* 아바타 */}
                    {!isMe && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-xs font-medium text-white">
                        {message.senderNickname.charAt(0)}
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
                          'inline-block rounded-2xl px-3 py-2 text-sm max-w-full break-words text-left',
                          isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                        )}
                      >
                        <ReactMarkdown
                          components={{
                            pre: PreBlock,
                            code: ({ node, className, children, ...props }: any) => {
                              return (
                                <code
                                  className={cn(
                                    'rounded px-1 bg-black/10 dark:bg-white/10 font-mono text-sm',
                                    className,
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
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
                const isMicOff = micState[participant.id];
                const isCamOff = camState[participant.id];

                return (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    {/* 아바타 */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-sm font-medium text-white">
                      {participant.nickname.charAt(0)}
                    </div>

                    {/* 이름 및 상태 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{participant.nickname}</span>
                        {participant.isHost && <span className="text-xs text-yellow-500">👑</span>}
                      </div>
                      <span
                        className={cn(
                          'text-xs',
                          participant.status === 'READY' ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {participant.isHost
                          ? '방장'
                          : participant.status === 'READY'
                            ? '준비 완료'
                            : '준비 대기'}
                      </span>
                    </div>

                    {/* 상태 표시 아이콘 (우측 정렬, 메뉴 공간 확보) */}
                    <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                      {isMicOff ? (
                        <MicOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {isCamOff ? (
                        <VideoOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </div>

                    {/* 방장 메뉴 (방장만, 내 아이템(방장) 옆에 점 3개, 없을 경우 공간만 차지하거나 조정) */}
                    <div className="relative w-8 flex justify-center ml-1 shrink-0">
                      {isHost && participant.isHost && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {/* 드롭다운 메뉴 */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-white dark:bg-zinc-950 p-1 shadow-lg text-popover-foreground"
                            >
                              <button
                                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMuteAll?.();
                                  setIsMenuOpen(false);
                                }}
                              >
                                <MicOff className="h-4 w-4 text-destructive" />
                                모두 음소거
                              </button>
                              <button
                                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTurnOffAllCams?.();
                                  setIsMenuOpen(false);
                                }}
                              >
                                <VideoOff className="h-4 w-4 text-destructive" />
                                모두 카메라 끄기
                              </button>
                            </div>
                          )}
                        </>
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
