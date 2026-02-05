import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import Image from 'next/image';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameProblem, Team, GamePlayParticipant } from '@/domains/game/types/game-types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GameProblemListPanelProps {
  problems: GameProblem[];
  selectedProblemId: number | null;
  onSelectProblem: (problemId: number) => void;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  teamType: 'INDIVIDUAL' | 'TEAM';
  participants: GamePlayParticipant[];
  isFolded: boolean;
  onToggleFold: () => void;
  className?: string;
  currentUserId: number;
}

export function GameProblemListPanel({
  problems,
  selectedProblemId,
  onSelectProblem,
  mode,
  teamType,
  participants,
  isFolded,
  onToggleFold,
  className,
  currentUserId,
}: GameProblemListPanelProps) {
  if (isFolded) {
    return (
      <div className={cn('flex flex-col items-center py-4', className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFold}
          className="h-8 w-8"
          title="문제 목록 펼치기"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col bg-card', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-4 h-14 shrink-0">
        <span className="text-sm font-medium">문제 목록</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFold}
          className="h-8 w-8"
          title="문제 목록 접기"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* 문제 리스트 */}
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-3">
          {problems.map((problem) => {
            const isSolvedByMe = problem.solvedBy?.some((s) => s.id === currentUserId);
            return (
              <li key={problem.id}>
                <button
                  type="button"
                  onClick={() => onSelectProblem(problem.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all',
                    selectedProblemId === problem.id
                      ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/40'
                      : 'border-border bg-background hover:border-primary/30 hover:shadow-sm',
                  )}
                >
                  {/* 문제 번호 */}
                  <div className="mb-1 text-xs text-muted-foreground">#{problem.externalId}</div>

                  {/* 제목 및 상태 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{problem.title}</span>
                      <a
                        href={`https://www.acmicpc.net/problem/${problem.externalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                        title="백준 문제 보러가기"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* 개인전일 때만 성공 표시 */}
                    {teamType === 'INDIVIDUAL' &&
                      (isSolvedByMe ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/50" />
                      ))}
                  </div>

                  {/* 풀이 현황 */}
                  <div className="mt-2">
                    {mode === 'SPEED_RACE' && teamType === 'INDIVIDUAL' ? (
                      // 개인전 스피드: 푼 사람 목록
                      <div className="flex flex-col gap-1">
                        <SolvedByList
                          solvedBy={problem.solvedBy}
                          teamType={teamType}
                          participants={participants}
                        />
                      </div>
                    ) : (
                      // 팀전 또는 타임어택: 풀이 유저 표시
                      <SolvedByList
                        solvedBy={problem.solvedBy}
                        teamType={teamType}
                        participants={participants}
                      />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// 풀이 현황 컴포넌트
// 풀이 현황 컴포넌트
function SolvedByList({
  solvedBy = [],
  teamType,
  participants,
}: {
  solvedBy?: { id: number; nickname: string; team?: Team }[];
  teamType: 'INDIVIDUAL' | 'TEAM';
  participants: GamePlayParticipant[];
}) {
  // 참여자 정보 찾기 헬퍼
  const getParticipant = (id: number) => participants.find((p) => p.id === id);

  // 아바타 렌더링
  const renderUserIcon = (id: number, sizeClass = 'h-5 w-5') => {
    const p = getParticipant(id);
    if (!p) return null;
    return (
      <TooltipProvider delayDuration={0} key={id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <UserIcon
                key={id}
                src={p.profileImg}
                nickname={p.nickname}
                size={20}
                className="border-background"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{p.nickname}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (teamType === 'TEAM') {
    const redSolved = solvedBy.filter((s) => s.team === 'RED');
    const blueSolved = solvedBy.filter((s) => s.team === 'BLUE');

    return (
      <div className="mt-2 flex items-center justify-between text-xs">
        {/* BLUE TEAM */}
        <div className="flex flex-col gap-1 items-start">
          <span className="text-[10px] font-semibold text-blue-500">BLUE</span>
          <div className="flex items-center gap-1 h-5">
            {blueSolved.length > 0 ? (
              <div className="flex -space-x-1.5">{blueSolved.map((s) => renderUserIcon(s.id))}</div>
            ) : (
              <div className="h-5 w-5 rounded-full border border-dashed border-blue-200" />
            )}
          </div>
        </div>

        {/* RED TEAM */}
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] font-semibold text-red-500">RED</span>
          <div className="flex items-center gap-1 h-5">
            {redSolved.length > 0 ? (
              <div className="flex -space-x-1.5">{redSolved.map((s) => renderUserIcon(s.id))}</div>
            ) : (
              <div className="h-5 w-5 rounded-full border border-dashed border-red-200" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 개인전: 푼 사람 목록 나열 (최대 5명)
  if (solvedBy.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex -space-x-1.5">{solvedBy.slice(0, 5).map((s) => renderUserIcon(s.id))}</div>
      {solvedBy.length > 5 && (
        <span className="text-[10px] text-muted-foreground">+{solvedBy.length - 5}</span>
      )}
    </div>
  );
}
