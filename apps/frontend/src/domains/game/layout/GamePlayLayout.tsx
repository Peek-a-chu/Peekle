'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useParticipants } from '@livekit/components-react'; // Added import
import { Button } from '@/components/ui/button';
import { ActionModal } from '@/components/common/Modal';
import { GamePlayHeader } from '@/domains/game/components/game-play-header';
import { GameProblemListPanel } from '@/domains/game/components/game-problem-list-panel';
import { GamePlayCenterPanel } from '@/domains/game/components/game-play-center-panel';
import { GameRightPanel } from '@/domains/game/components/GameRightPanel';
import { GameChatPanel } from '@/domains/game/components/GameChatPanel';
import { GameParticipantPanel } from '@/domains/game/components/GameParticipantPanel';
import { GameControlBar } from '@/domains/game/components/game-control-bar';
import {
  GamePlayState,
  GameProblem,
  GamePlayParticipant,
  ChatMessage,
} from '@/domains/game/types/game-types';
import { CCGameResultModal } from '@/domains/game/components/game-result-modal/CCGameResultModal';
import SettingsModal from '@/domains/settings/components/SettingsModal';

// Constants for resizing
const RIGHT_PANEL_MIN_WIDTH = 260;
const RIGHT_PANEL_MAX_WIDTH = 480;

interface GamePlayLayoutProps {
  className?: string;
  gameState: GamePlayState;
  problems: GameProblem[];
  selectedProblemId: number | null;
  onSelectProblem: (problemId: number) => void;
  formattedTime: string;
  code: string;
  language: string;
  onCodeChange: (code: string, language?: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmit: () => void;
  messages: ChatMessage[];
  participants: GamePlayParticipant[];
  currentUserId: number;
  onSendMessage: (content: string) => void;
  onLeave: () => void;
  onForfeit: () => void;
  onlineUserIds: Set<number>;
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
  onLeave,
  onForfeit,
  onlineUserIds,
}: GamePlayLayoutProps) {
  const [isLeftPanelFolded, setIsLeftPanelFolded] = useState(false);
  const [isRightPanelFolded, setIsRightPanelFolded] = useState(false);
  const [isForfeitModalOpen, setIsForfeitModalOpen] = useState(false);

  // 미디어 상태 관리 (Mock)
  const [micState, setMicState] = useState<Record<string, boolean>>({});
  const [camState, setCamState] = useState<Record<string, boolean>>({});

  const isHost = participants.find((p) => p.id === currentUserId)?.isHost || false;

  const handleMuteAll = () => {
    const newState: Record<string, boolean> = {};
    participants.forEach((p) => (newState[p.id] = true));
    setMicState((prev) => ({ ...prev, ...newState }));
  };

  const handleTurnOffAllCams = () => {
    const newState: Record<string, boolean> = {};
    participants.forEach((p) => (newState[p.id] = true));
    setCamState((prev) => ({ ...prev, ...newState }));
  };



  const handleForfeitClick = () => {
    setIsForfeitModalOpen(true);
  };

  const handleConfirmForfeit = () => {
    setIsForfeitModalOpen(false);
    onForfeit();
  };

  // LiveKit Participants for Online Status
  const liveKitParticipants = useParticipants();

  // Merge Socket Online IDs + LiveKit Online IDs
  const allOnlineUserIds = new Set(onlineUserIds);
  liveKitParticipants.forEach((p) => {
    const userId = parseInt(p.identity, 10);
    if (!isNaN(userId)) {
      allOnlineUserIds.add(userId);
    }
  });

  // Team Filtering Logic
  const myTeam = participants.find((p) => p.id === currentUserId)?.team;
  const visibleParticipants =
    gameState.teamType === 'TEAM' && myTeam
      ? participants.filter((p) => p.team === myTeam)
      : participants;

  // Filtered Online Count
  const visibleOnlineCount = visibleParticipants.filter((p) => allOnlineUserIds.has(p.id)).length;

  return (
    <div className={cn('flex h-screen flex-col bg-background', className)}>
      {/* 헤더 */}
      <GamePlayHeader
        title={gameState.title}
        mode={gameState.mode}
        teamType={gameState.teamType}
        formattedTime={formattedTime}
        scores={gameState.scores || { RED: 0, BLUE: 0 }}
        onLeave={onLeave}
        onForfeit={handleForfeitClick}
      />

      {/* 메인 콘텐츠 */}
      <div className="relative flex min-h-0 flex-1">
        {/* 좌측: 문제 목록 */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-all duration-300 ease-in-out',
            isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : 'w-72',
          )}
        >
          <div className="w-72 h-full">
            <GameProblemListPanel
              problems={problems}
              selectedProblemId={selectedProblemId}
              onSelectProblem={onSelectProblem}
              mode={gameState.mode}
              teamType={gameState.teamType}
              participants={participants}
              isFolded={isLeftPanelFolded}
              onToggleFold={() => setIsLeftPanelFolded((prev) => !prev)}
              currentUserId={currentUserId}
            />
          </div>
        </aside>

        {/* 중앙: IDE */}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col transition-all duration-300',
            isLeftPanelFolded && 'pl-12',
          )}
        >
          {/* Unfold Left Panel Button */}
          {isLeftPanelFolded && (
            <div className="absolute left-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLeftPanelFolded(false)}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur text-muted-foreground hover:text-foreground hover:bg-background"
                title="문제 목록 펼치기"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Unfold Right Panel Button - Only when folded */}
          {isRightPanelFolded && (
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRightPanelFolded(false)}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur text-muted-foreground hover:text-foreground hover:bg-background"
                title="채팅 패널 펼치기"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <GamePlayCenterPanel
              code={code}
              language={language}
              participants={visibleParticipants} // Use filtered participants
              currentUserId={currentUserId}
              onCodeChange={onCodeChange}
              onLanguageChange={onLanguageChange}
              onSubmit={onSubmit}
              externalId={problems.find((p) => p.id === selectedProblemId)?.externalId}
              selectedProblemUrl={
                problems.find((p) => p.id === selectedProblemId)
                  ? `https://www.acmicpc.net/problem/${problems.find((p) => p.id === selectedProblemId)!.externalId}`
                  : undefined
              }
              micState={micState}
              camState={camState}
            />
          </div>

          {/* 하단 미디어 컨트롤 바 */}
          <GameControlBar
            className="shrink-0"
            onSettingsClick={() => {
              console.log('Settings clicked');
            }}
          />
        </main>

        {/* 우측: 채팅/참여자 패널 */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-card transition-all duration-300 ease-in-out',
            isRightPanelFolded ? 'w-0 border-l-0 overflow-hidden' : 'w-80',
          )}
        >
          <div className="w-80 h-full">
            <GameRightPanel
              onlineCount={visibleOnlineCount} // Use filtered online count
              totalCount={visibleParticipants.length} // Use filtered total count
              onFold={() => setIsRightPanelFolded(true)}
              chatContent={
                <GameChatPanel
                  messages={messages}
                  participants={participants} // Keep full list for chat
                  currentUserId={currentUserId}
                  isHost={participants.find((p) => p.id === currentUserId)?.isHost || false}
                  onSendMessage={onSendMessage}
                  teamType={gameState.teamType}
                />
              }
              participantsContent={
                <GameParticipantPanel
                  participants={visibleParticipants} // Use filtered participants
                  currentUserId={currentUserId}
                  isHost={isHost}
                  micState={micState}
                  camState={camState}
                  onMuteAll={handleMuteAll}
                  onKick={() => { }}
                  onDelegate={() => { }}
                  onlineUserIds={allOnlineUserIds}
                  teamType={gameState.teamType}
                />
              }
            />
          </div>
        </aside>
      </div>

      {/* 게임 결과 모달 */}
      < CCGameResultModal
        isOpen={gameState.status === 'END'}
        onClose={() => { }
        }
        data={{
          participants: (gameState.result?.ranking || []).map((r, idx) => ({
            userId: r.userId,
            nickname: r.nickname,
            score: r.score,
            rank: idx + 1,
            isMe: r.userId === currentUserId,
            solvedCount: r.solvedCount,
            teamId: r.teamColor,
            profileImg: (r as any).profileImg,
            clearTime: (r as any).clearTime,
          })),
          personalStats: {
            pointsGained: (gameState.result?.ranking?.find(r => r.userId === currentUserId) as any)?.gainedExp || 0,
            correctAnswers: gameState.result?.ranking?.find(r => r.userId === currentUserId)?.solvedCount || 0,
            totalQuestions: gameState.problems.length,
            accuracy: gameState.problems.length > 0
              ? Math.round(((gameState.result?.ranking?.find(r => r.userId === currentUserId)?.solvedCount || 0) / gameState.problems.length) * 100)
              : 0,
          },
          leagueInfo: {
            league: (gameState.result?.ranking?.find(r => r.userId === currentUserId) as any)?.league || 'STONE',
            currentExp: (gameState.result?.ranking?.find(r => r.userId === currentUserId) as any)?.currentExp || 0,
            gainedExp: (gameState.result?.ranking?.find(r => r.userId === currentUserId) as any)?.gainedExp || 0,
          },
          mode: gameState.mode,
          teamType: gameState.teamType,
          playTime: (gameState.result?.ranking?.find(r => r.userId === currentUserId) as any)?.clearTime || 0,
        }}
      />

      {/* 포기 확인 모달 */}
      <ActionModal
        isOpen={isForfeitModalOpen}
        onClose={() => setIsForfeitModalOpen(false)}
        onConfirm={handleConfirmForfeit}
        title="게임 포기"
        description="정말로 게임을 포기하시겠습니까? 포기하면 게임에 다시 참여할 수 없습니다."
        cancelText="취소"
        confirmText="포기하기"
        variant="destructive"
      />

      {/* 설정 모달 */}
      <SettingsModal />
    </div >
  );
}
