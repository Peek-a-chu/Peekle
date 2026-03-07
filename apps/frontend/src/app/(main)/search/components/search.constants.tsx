import ProblemIcon from '@/assets/icons/problem.svg';
import BookIcon from '@/assets/icons/book.svg';
import PeopleIcon from '@/assets/icons/people.svg';
import { LayoutGrid } from 'lucide-react';
import type { SearchType } from './search.types';

export const TABS: { value: SearchType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: '전체', icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'problem', label: '문제', icon: <ProblemIcon className="h-4 w-4" /> },
    { value: 'workbook', label: '문제집', icon: <BookIcon className="h-4 w-4" /> },
    { value: 'user', label: '사용자', icon: <PeopleIcon className="h-4 w-4" /> },
];

export const SUGGESTED_KEYWORDS = [
    'DP',
    'DFS',
    'BFS',
    'Binary Search',
    'Graph',
    'Greedy',
    'Implementation',
    'Math',
];

export const TIER_COLORS: Record<string, { bg: string; text: string }> = {
    BRONZE: { bg: 'bg-[#AD5600]/10', text: 'text-[#AD5600]' },
    SILVER: { bg: 'bg-[#435F7A]/10', text: 'text-[#435F7A]' },
    GOLD: { bg: 'bg-[#EC9A00]/10', text: 'text-[#EC9A00]' },
    PLATINUM: { bg: 'bg-[#27E2A4]/10', text: 'text-[#27E2A4]' },
    DIAMOND: { bg: 'bg-[#00B4FC]/10', text: 'text-[#00B4FC]' },
    RUBY: { bg: 'bg-[#FF0062]/10', text: 'text-[#FF0062]' },
    MASTER: { bg: 'bg-[#B300E0]/10', text: 'text-[#B300E0]' },
};

const TIER_LABELS: Record<string, string> = {
    BRONZE: '브론즈',
    SILVER: '실버',
    GOLD: '골드',
    PLATINUM: '플래티넘',
    DIAMOND: '다이아',
    RUBY: '루비',
    MASTER: '마스터',
};

const LEAGUE_LABELS: Record<string, string> = {
    stone: '스톤',
    bronze: '브론즈',
    silver: '실버',
    gold: '골드',
    platinum: '플래티넘',
    emerald: '에메랄드',
    diamond: '다이아',
    ruby: '루비',
    unranked: '언랭크',
    unknown: '언랭크',
};

export const normalizeTierKey = (tierStr?: string): string => {
    if (!tierStr) return '';

    let tierKey = tierStr.toUpperCase();
    if (tierKey.includes(' ')) {
        tierKey = tierKey.split(' ')[0];
    } else if (tierKey.includes('_')) {
        tierKey = tierKey.split('_')[0];
    }
    return tierKey;
};

export const getTierStyle = (tierStr?: string) => {
    if (!tierStr) return { bg: 'bg-muted', text: 'text-muted-foreground' };

    const tierKey = normalizeTierKey(tierStr);

    return TIER_COLORS[tierKey] || { bg: 'bg-muted', text: 'text-muted-foreground' };
};

export const getTierDisplayName = (tierStr?: string): string => {
    const tierKey = normalizeTierKey(tierStr);
    if (!tierKey) return '미분류';

    return TIER_LABELS[tierKey] || tierKey;
};

export const getLeagueDisplayName = (league?: string): string => {
    if (!league) return '언랭크';

    const normalizedLeague = league.toLowerCase().trim();
    return LEAGUE_LABELS[normalizedLeague] || league;
};

export const highlightMatch = (text: string, searchQuery: string): React.JSX.Element => {
    if (!text) return <></>;
    if (!searchQuery) return <>{text}</>;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) =>
                regex.test(part) ? (
                    <mark
                        key={index}
                        className="bg-[#E24EA0]/20 text-[#E24EA0] font-semibold rounded-sm px-0.5"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </>
    );
};
