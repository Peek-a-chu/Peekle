'use client';

import { Clock, ArrowLeft, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GamePlayHeaderProps {
  title: string;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  teamType: 'INDIVIDUAL' | 'TEAM';
  formattedTime: string;
  scores?: { RED: number; BLUE: number };
  onLeave?: () => void;
  onForfeit?: () => void;
  className?: string;
}

export function GamePlayHeader({
  title,
  mode,
  teamType,
  formattedTime,
  scores,
  onLeave,
  onForfeit,
  className,
}: GamePlayHeaderProps) {
  const modeLabel = mode === 'SPEED_RACE' ? '스피드 레이스' : '시간제한';
  const teamLabel = teamType === 'TEAM' ? '팀전' : '개인전';

  return (
    <header
      className={cn(
        'relative flex items-center justify-between border-b border-border bg-card px-6 h-14 shrink-0',
        className,
      )}
    >
      {/* 좌측: 나가기 버튼 + 방 제목 + 모드 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeave}
          aria-label="뒤로 가기"
          className="text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {teamLabel}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {modeLabel}
          </span>
        </div>
      </div>

      {/* 중앙 (absolute): 타이머 + 팀 스코어 */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
        {/* 타이머 */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold text-primary tabular-nums">{formattedTime}</span>
        </div>

        {/* 팀 스코어 (팀전일 경우) */}
        {teamType === 'TEAM' && scores && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-red-500">RED</span>
              <span className="text-2xl font-bold text-red-500">{scores.RED}</span>
            </div>
            <span className="text-xl font-medium text-muted-foreground">:</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-500">{scores.BLUE}</span>
              <span className="text-sm font-medium text-blue-500">BLUE</span>
            </div>
          </div>
        )}
      </div>

      {/* 우측: 포기하기 버튼 */}
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onForfeit}
          className="bg-destructive hover:bg-destructive/90"
          title="게임 포기하기"
        >
          <Flag className="h-4 w-4 mr-2" />
          포기하기
        </Button>
      </div>
    </header>
  );
}
