'use client';

import { ArrowLeft, UserPlus, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomSettingsPanel } from '../components/room-settings-panel';
import { ParticipantGrid } from '../components/participant-grid';
import { WaitingRoomChatPanel } from '../components/WaitingRoomChatPanel';
import { GameInviteModal } from '../components/game-invite-modal';
import { GameCountdownOverlay } from '../components/game-countdown-overlay';
import { WaitingRoomMediaPanel } from '../components/WaitingRoomMediaPanel';
import type { GameRoomDetail, ChatMessage } from '@/domains/game/types/game-types';
import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import { toast } from 'sonner';

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
  currentUserId: number;
  isHost: boolean;
  isReady: boolean;
  isCountingDown: boolean;
  inviteModalOpen: boolean;
  onInviteModalChange: (open: boolean) => void;
  onSendMessage: (content: string) => void;
  onReady: () => void;
  onCancelReady: () => void;
  onStartGame: () => void;
  onCountdownComplete: (mediaState?: { mic: boolean; cam: boolean }) => void;
  onKickParticipant: (participantId: number) => void;
  onChangeTeam: () => void;
}

export function GameWaitingRoomLayout({
  room,
  messages,
  currentUserId,
  isHost,
  isReady,
  isCountingDown,
  inviteModalOpen,
  onInviteModalChange,
  onSendMessage,
  onReady,
  onCancelReady,
  onStartGame,
  onCountdownComplete,
  onKickParticipant,
  onChangeTeam,
}: GameWaitingRoomLayoutProps) {
  const router = useRouter();
  const {
    selectedCameraId,
    selectedMicId,
    isMicOn,
    isCamOn,
    setMicOn,
    setCamOn,
  } = useSettingsStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Camera Preview Logic
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startPreview = async () => {
      // 1. Cleanup previous stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (!isCamOn) {
        setLocalStream(null);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
            width: { ideal: 640 },
            height: { ideal: 360 },
          },
        });
        setLocalStream(stream);
      } catch (e) {
        console.warn('Camera preview failed', e);
        setCamOn(false);
        toast.error('카메라를 시작할 수 없습니다.');
      }
    };

    void startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCamOn, selectedCameraId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

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
              <Badge variant="secondary" className="text-xs dark:text-zinc-900">
                {teamLabels[room.teamType]}
              </Badge>
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                {modeLabels[room.mode]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              ⏱️ {Math.floor(room.timeLimit / 60)}분 · 📝 {room.problemCount}문제 · 👥 {room.maxPlayers}명
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
            problems={room.problems}
            workbookTitle={room.workbookTitle}
          />

          {/* 참여자 그리드 */}
          <ParticipantGrid
            participants={room.participants}
            maxPlayers={room.maxPlayers}
            currentPlayers={room.currentPlayers}
            teamType={room.teamType}
            isHost={isHost}
            onKickParticipant={onKickParticipant}
            currentUserId={currentUserId}
          />

          {/* 액션 버튼 */}
          <div className="flex justify-center items-center gap-4 pt-2 relative">
            {/* 좌측 하단 미디어 컨트롤 */}
            {/* 좌측 하단 미디어 컨트롤 (제거됨 - 상단 패널로 이동) */}
            <div className="absolute left-0 bottom-0 flex gap-2">
              {/* Moved to "My Media Settings" panel */}
            </div>

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
                className="min-w-[200px] bg-primary text-primary-foreground hover:scale-105 transition-all duration-200 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                disabled={!canStart}
                onClick={onStartGame}
              >
                시작하기
              </Button>
            ) : isReady ? (
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-2 border-primary/50 text-primary hover:bg-primary/5 hover:scale-105 transition-all duration-200"
                onClick={onCancelReady}
              >
                준비 취소
              </Button>
            ) : (
              <Button
                size="lg"
                className="min-w-[200px] bg-primary text-primary-foreground hover:scale-105 transition-all duration-200 shadow-lg shadow-primary/20"
                onClick={onReady}
              >
                준비하기
              </Button>
            )}
          </div>

          <WaitingRoomMediaPanel
            localStream={localStream}
          />
        </main>

        {/* 우측: 채팅 패널 */}
        <aside className="w-80 border-l">
          <WaitingRoomChatPanel
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
      <GameInviteModal open={inviteModalOpen} onOpenChange={onInviteModalChange} roomId={room.id} />

      {/* 카운트다운 오버레이 */}
      <GameCountdownOverlay
        isActive={isCountingDown}
        onComplete={() => onCountdownComplete({ mic: isMicOn, cam: isCamOn })}
      />
    </div>
  );
}
