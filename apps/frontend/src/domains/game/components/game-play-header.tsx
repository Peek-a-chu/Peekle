'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamePlayHeaderProps {
  title: string;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  teamType: 'INDIVIDUAL' | 'TEAM';
  formattedTime: string;
  scores?: { RED: number; BLUE: number };
  className?: string;
}

export function GamePlayHeader({
  title,
  mode,
  teamType,
  formattedTime,
  scores,
  className,
}: GamePlayHeaderProps) {
  const modeLabel = mode === 'SPEED_RACE' ? '스피드 레이스' : '시간제한';
  const teamLabel = teamType === 'TEAM' ? '팀전' : '개인전';

  return (
    <header
      className={cn(
        'flex items-center justify-between border-b border-border bg-card px-6 h-14 shrink-0',
        className,
      )}
    >
      {/* 좌측: 방 제목 및 모드 */}
      <div className="flex items-center gap-4">
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

      {/* 중앙: 팀 스코어 (팀전일 경우) */}
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

      {/* 우측: 타이머 */}
      <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-lg font-bold text-primary tabular-nums">{formattedTime}</span>
      </div>
    </header>
  );
}
