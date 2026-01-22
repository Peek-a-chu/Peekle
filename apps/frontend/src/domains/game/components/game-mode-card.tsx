'use client'

import { Timer, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameMode, TeamType } from '@/domains/game/mocks/mock-data'

interface GameModeCardProps {
    mode: GameMode
    teamType: TeamType
    title: string
    description: string
    isSelected: boolean
    onClick: () => void
}

const iconMap = {
    TIME_ATTACK_INDIVIDUAL: Timer,
    TIME_ATTACK_TEAM: Users,
    SPEED_RACE_INDIVIDUAL: Zap,
    SPEED_RACE_TEAM: Users,
}

const colorMap = {
    INDIVIDUAL: {
        border: 'border-red-400',       // 테두리 (항상 적용)
        bg: 'bg-card',                  // 기본: 흰색 배경
        hoverBg: 'hover:bg-red-50',   // 호버: 연한 빨강 (Tailwind 기본)
        selectedBg: 'bg-red-100', // 선택: 더 진한 빨강 (Tailwind 기본)
        icon: 'text-red-500',            // 아이콘
    },
    TEAM: {
        border: 'border-blue-400',       // 테두리 (항상 적용)
        bg: 'bg-card',                  // 기본: 흰색 배경
        hoverBg: 'hover:bg-blue-50',     // 호버: 연한 파랑 (Tailwind 기본)
        selectedBg: 'bg-blue-100',       // 선택: 더 진한 파랑 (Tailwind 기본)
        icon: 'text-blue-500',           // 아이콘
    },
}

export function GameModeCard({
    mode,
    teamType,
    title,
    description,
    isSelected,
    onClick,
}: GameModeCardProps) {
    const iconKey = `${mode}_${teamType}` as keyof typeof iconMap
    const Icon = iconMap[iconKey]
    const colors = colorMap[teamType]

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 transition-all duration-200',
                colors.border,  // 테두리 항상 적용
                isSelected
                    ? colors.selectedBg  // 선택됨: 진한 배경
                    : [colors.bg, colors.hoverBg]  // 기본: 흰색 + 호버 시 연한 배경
            )}
        >
            <div
                className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm')}
            >
                <Icon className={cn('h-6 w-6', colors.icon)} />
            </div>
            <div className="text-center">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
        </button>
    )
}
