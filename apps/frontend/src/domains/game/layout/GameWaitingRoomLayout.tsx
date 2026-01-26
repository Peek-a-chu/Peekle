'use client';

import { ArrowLeft, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomSettingsPanel } from '../components/room-settings-panel';
import { ParticipantGrid } from '../components/participant-grid';
import { ChatPanel } from '../components/chat-panel';
import { InviteModal } from '../components/invite-modal';
import type { GameRoomDetail, ChatMessage } from '@/domains/game/mocks/mock-data';

const modeLabels = {
  TIME_ATTACK: '타임어택',
  SPEED_RACE: '스피드',
};

const teamLabels = {
  INDIVIDUAL: '개인전',
  TEAM: '팀전',
};

interface GameWaitingRoomLayoutProps {
  room: GameRoomDetail;
  messages: ChatMessage[];
  currentUserId: string;
  isHost: boolean;
  isReady: boolean;
  inviteModalOpen: boolean;
  onInviteModalChange: (open: boolean) => void;
  onSendMessage: (content: string) => void;
  onReady: () => void;
  onCancelReady: () => void;
  onStartGame: () => void;
  onKickParticipant: (participantId: string) => void;
  onChangeTeam: () => void;
}

export function GameWaitingRoomLayout({
  room,
  messages,
  currentUserId,
  isHost,
  isReady,
  inviteModalOpen,
  onInviteModalChange,
  onSendMessage,
  onReady,
  onCancelReady,
  onStartGame,
  onKickParticipant,
  onChangeTeam,
}: GameWaitingRoomLayoutProps) {
  const router = useRouter();

  // 모든 참여자가 준비 완료인지 확인 (방장 제외)
  const allReady = room.participants.filter((p) => !p.isHost).every((p) => p.status === 'READY');

  // 시작 가능 조건: 2명 이상 + 모든 참여자 준비 완료
  const canStart = room.currentPlayers >= 2 && allReady;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* 헤더 */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/game')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{room.title}</h1>
              <Badge variant="secondary" className="text-xs">
                {teamLabels[room.teamType]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {modeLabels[room.mode]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              ⏱️ {room.timeLimit}분 · 📝 {room.problemCount}문제 · 👥 {room.maxPlayers}명
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onInviteModalChange(true)}
        >
          <UserPlus className="h-4 w-4" />
          초대하기
        </Button>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex min-h-0 flex-1">
        {/* 좌측: 방 설정 + 참여자 그리드 */}
        <main className="flex flex-1 flex-col gap-3 p-4">
          {/* 방 설정 패널 */}
          <RoomSettingsPanel
            timeLimit={room.timeLimit}
            problemCount={room.problemCount}
            maxPlayers={room.maxPlayers}
            tierMin={room.tierMin}
            tierMax={room.tierMax}
            tags={room.tags}
          />

          {/* 참여자 그리드 */}
          <ParticipantGrid
            participants={room.participants}
            maxPlayers={room.maxPlayers}
            currentPlayers={room.currentPlayers}
            teamType={room.teamType}
          />

          {/* 액션 버튼 */}
          <div className="flex justify-center gap-4 pt-2">
            {room.teamType === 'TEAM' && (!isReady || isHost) && (
              <Button
                size="lg"
                variant="outline"
                className="min-w-[150px] border-2 border-primary/50 hover:border-primary hover:bg-accent"
                onClick={onChangeTeam}
              >
                팀 변경
              </Button>
            )}
            {isHost ? (
              <Button
                size="lg"
                className="min-w-[200px]"
                disabled={!canStart}
                onClick={onStartGame}
              >
                시작하기
              </Button>
            ) : isReady ? (
              <Button size="lg" variant="outline" className="min-w-[200px]" onClick={onCancelReady}>
                준비 취소
              </Button>
            ) : (
              <Button
                size="lg"
                className="min-w-[200px] opacity-50 transition-opacity hover:opacity-100"
                onClick={onReady}
              >
                준비하기
              </Button>
            )}
          </div>
        </main>

        {/* 우측: 채팅 패널 */}
        <aside className="w-80 border-l">
          <ChatPanel
            messages={messages}
            participants={room.participants}
            currentUserId={currentUserId}
            isHost={isHost}
            onSendMessage={onSendMessage}
            onKickParticipant={onKickParticipant}
          />
        </aside>
      </div>

      {/* 초대 모달 */}
      <InviteModal open={inviteModalOpen} onOpenChange={onInviteModalChange} roomId={room.id} />
    </div>
  );
}
