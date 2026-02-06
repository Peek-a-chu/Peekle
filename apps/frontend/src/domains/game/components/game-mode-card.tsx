'use client';

import { Timer, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameMode, TeamType } from '@/domains/game/types/game-types';

interface GameModeCardProps {
  mode: GameMode;
  teamType: TeamType;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

const iconMap = {
  TIME_ATTACK_INDIVIDUAL: Timer,
  TIME_ATTACK_TEAM: Users,
  SPEED_RACE_INDIVIDUAL: Zap,
  SPEED_RACE_TEAM: Users,
};

const colorMap = {
  INDIVIDUAL: {
    border: 'border-red-100', // 테두리 (항상 적용)
    bg: 'bg-card', // 기본: 흰색 배경
    hoverBg: 'hover:bg-red-50', // 호버: 연한 빨강 (Tailwind 기본)
    selectedBg: 'bg-red-100', // 선택: 더 진한 빨강 (Tailwind 기본)
    icon: 'text-red-500', // 아이콘
  },
  TEAM: {
    border: 'border-blue-100', // 테두리 (항상 적용)
    bg: 'bg-card', // 기본: 흰색 배경
    hoverBg: 'hover:bg-blue-50', // 호버: 연한 파랑 (Tailwind 기본)
    selectedBg: 'bg-blue-100', // 선택: 더 진한 파랑 (Tailwind 기본)
    icon: 'text-blue-500', // 아이콘
  },
};

export function GameModeCard({
  mode,
  teamType,
  title,
  description,
  isSelected,
  onClick,
}: GameModeCardProps): React.ReactElement {
  const iconKey = `${mode}_${teamType}`;
  const Icon = iconMap[iconKey as keyof typeof iconMap] ?? Zap;
  const colors = colorMap[teamType];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200',
        colors.border, // 테두리 항상 적용
        isSelected
          ? [colors.selectedBg, 'text-zinc-700 dark:text-zinc-700'] // 선택됨: 진한 배경 + 회색 글자
          : [colors.bg, colors.hoverBg, 'hover:text-zinc-700 dark:hover:text-zinc-700'], // 기본: 흰색 + 호버 시 연한 배경 + 회색 글자
      )}
    >
      <div
        className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm')}
      >
        <Icon className={cn('h-6 w-6', colors.icon)} />
      </div>
      <div className="text-center">
        <h3
          className={cn(
            'font-semibold transition-colors',
            isSelected ? 'text-zinc-700' : 'text-foreground group-hover:text-zinc-700',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'mt-1 text-xs transition-colors',
            isSelected ? 'text-zinc-600' : 'text-muted-foreground group-hover:text-zinc-600',
          )}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
