'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankResponse } from '@/api/rankingApi';
import PeopleIcon from '@/assets/icons/people.svg';
import TrophyIcon from '@/assets/icons/trophy.svg';
import { CCUserProfileModal } from '@/components/common/CCUserProfileModal';

interface StudyRankingListProps {
  rankings: RankResponse[];
  expandedIds: number[];
  onToggleExpand: (studyId: number) => void;
  onStudyClick: (studyId: number) => void;
  highlightedStudyId?: number | null;
  scope: 'ALL' | 'MINE';
  onScopeChange: (scope: 'ALL' | 'MINE') => void;
  sortBy?: 'RANK' | 'POINT' | 'MEMBERS';
  onSortByChange?: (sortBy: 'RANK' | 'POINT' | 'MEMBERS') => void;
  children?: React.ReactNode;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const tableCols = 'grid-cols-[4.5rem_minmax(0,1fr)_7rem_8.5rem_4.5rem]';

export function StudyRankingList({
  rankings,
  expandedIds,
  onToggleExpand,
  onStudyClick,
  highlightedStudyId = null,
  scope,
  onScopeChange,
  sortBy = 'RANK',
  onSortByChange,
  children,
  isLoading = false,
  searchTerm = '',
  onSearchChange,
}: StudyRankingListProps): React.ReactNode {
  const [selectedUserNickname, setSelectedUserNickname] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleUserClick = (nickname: string) => {
    setSelectedUserNickname(nickname);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <CCUserProfileModal
        nickname={selectedUserNickname}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      {children}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <div className="relative">
            <button className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
              <Search className="h-full w-full" />
            </button>
            <input
              type="text"
              placeholder="팀 이름으로 검색해보세요."
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground h-10"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#D8DFE4] bg-[#F7F8FC] p-1 dark:border-border dark:bg-muted">
            <button
              onClick={() => onScopeChange('ALL')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-all',
                scope === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-[#60717E] hover:text-[#040C13] dark:text-muted-foreground dark:hover:text-foreground',
              )}
            >
              <TrophyIcon className="h-4 w-4" />
              전체 팀
            </button>
            <button
              onClick={() => onScopeChange('MINE')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-all',
                scope === 'MINE'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-[#60717E] hover:text-[#040C13] dark:text-muted-foreground dark:hover:text-foreground',
              )}
            >
              <PeopleIcon className="h-4 w-4" />
              내 팀
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1">
            <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              className={cn(
                'rounded-md px-2 py-1 text-xs font-semibold',
                sortBy === 'RANK' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
              onClick={() => onSortByChange?.('RANK')}
            >
              기본
            </button>
            <button
              className={cn(
                'rounded-md px-2 py-1 text-xs font-semibold',
                sortBy === 'POINT' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
              onClick={() => onSortByChange?.('POINT')}
            >
              점수순
            </button>
            <button
              className={cn(
                'rounded-md px-2 py-1 text-xs font-semibold',
                sortBy === 'MEMBERS' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
              onClick={() => onSortByChange?.('MEMBERS')}
            >
              인원순
            </button>
          </div>
        </div>
      </div>

      {/* Table Header Row */}
      <div className={cn('hidden md:grid gap-4 px-6 py-2 text-sm font-medium text-slate-400 dark:text-muted-foreground', tableCols)}>
        <div className="text-center">순위</div>
        <div>팀 이름</div>
        <div className="text-center">인원</div>
        <div className="text-right">총 점수</div>
        <div className="text-center">상세</div>
      </div>

      {/* List Items */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 w-full bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={cn('space-y-3', scope === 'MINE' && 'space-y-6')}>
          {rankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-card dark:border-border">
              <div className="text-slate-400 mb-2 dark:text-muted-foreground">
                <Search className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-slate-500 font-medium dark:text-muted-foreground">
                {scope === 'MINE' ? '속한 스터디가 없습니다.' : '랭킹 정보가 없습니다.'}
              </p>
            </div>
          ) : (
            rankings.map((ranking) => {
              const isExpanded = expandedIds.includes(ranking.studyId);

              // Standard List Render (Table-like row)
              return (
                <div
                  key={ranking.studyId}
                  id={`ranking-study-${ranking.studyId}`}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200',
                    'border-slate-200 hover:border-slate-300 dark:border-border dark:bg-card dark:hover:border-primary/50',
                    highlightedStudyId === ranking.studyId &&
                      'ring-2 ring-primary/40 border-primary/40',
                  )}
                >
                  <div
                    className={cn(
                      'grid items-center gap-4 p-3 cursor-pointer select-none',
                      tableCols,
                      isExpanded ? 'bg-slate-50/50 dark:bg-muted/50' : '',
                    )}
                    onClick={() => onToggleExpand(ranking.studyId)}
                  >
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          'text-lg font-black italic',
                          ranking.rank <= 3 ? 'text-slate-800 dark:text-foreground' : 'text-slate-400 dark:text-muted-foreground',
                        )}
                      >
                        {ranking.rank}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-700 truncate text-base group-hover:text-primary transition-colors dark:text-card-foreground">
                        {ranking.name}
                      </h3>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full dark:bg-muted">
                        <span className="text-xs font-bold text-slate-600 tabular-nums dark:text-muted-foreground">
                          {ranking.memberCount}명
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end pr-2">
                      <div className="text-sm font-bold text-slate-800 tabular-nums dark:text-foreground">
                        {ranking.totalPoint.toLocaleString()}점
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-slate-400 dark:text-muted-foreground">
                      <span className="text-xs font-semibold">{isExpanded ? '닫기' : '상세'}</span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2 duration-200 dark:bg-muted/20 dark:border-border">
                      <h4 className="text-sm font-semibold text-slate-500 mb-3 pb-2 border-b border-slate-200 dark:text-muted-foreground dark:border-border">
                        스터디 멤버
                      </h4>
                      <div className="grid gap-3">
                        {ranking.members.map((member) => {
                          const displayImg = member.profileImgThumb || member.profileImg;
                          return (
                            <div
                              key={member.userId}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all hover:bg-slate-50 dark:bg-card dark:border-border dark:hover:bg-muted/50"
                              onClick={() => handleUserClick(member.nickname)}
                            >
                              <div className="flex items-center gap-3">
                                {displayImg ? (
                                  <img
                                    src={encodeURI(displayImg)}
                                    alt={member.nickname}
                                    className="h-10 w-10 rounded-full bg-slate-100 border border-slate-100"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 border border-slate-100 text-sm font-bold text-slate-500">
                                    {member.nickname.charAt(0)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700 text-sm dark:text-card-foreground">
                                    {member.nickname}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-1.5 py-0.5 rounded w-fit',
                                      member.role === 'OWNER'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground',
                                    )}
                                  >
                                    {member.role === 'OWNER' ? 'OWNER' : 'MEMBER'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
