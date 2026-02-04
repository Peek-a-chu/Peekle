'use client';

import Image from 'next/image';

export type LeagueType =
  | 'stone'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'emerald'
  | 'diamond'
  | 'ruby';

// 리그 순서 (낮은 순위 → 높은 순위)
export const LEAGUE_ORDER: LeagueType[] = [
  'stone',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'ruby',
];

// 리그 한글 이름
export const LEAGUE_NAMES: Record<LeagueType, string> = {
  stone: '스톤',
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플레티넘',
  emerald: '에메랄드',
  diamond: '다이아',
  ruby: '루비',
};

// 리그 색상 (차트 등에서 사용)
export const LEAGUE_COLORS: Record<LeagueType, string> = {
  stone: '#9CA3AF',
  bronze: '#CD7F32',
  silver: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#00CED1',
  emerald: '#50C878',
  diamond: '#B9F2FF',
  ruby: '#E0115F',
};

interface LeagueIconProps {
  league: LeagueType;
  size?: number;
  className?: string;
}

const LeagueIcon = ({ league, size = 24, className = '' }: LeagueIconProps) => {
  const safeLeague = (league?.toLowerCase() || 'stone') as LeagueType;

  return (
    <Image
      src={`/icons/league/${safeLeague}.svg`}
      alt={LEAGUE_NAMES[safeLeague] || 'League Icon'}
      width={size}
      height={size}
      className={className}
    />
  );
};

export default LeagueIcon;
