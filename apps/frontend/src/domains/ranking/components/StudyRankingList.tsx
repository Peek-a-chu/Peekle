'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RankResponse, StudyMemberResponse } from '@/api/rankingApi';
import PeopleIcon from '@/assets/icons/people.svg';
import TrophyIcon from '@/assets/icons/trophy.svg';
import ZoomIcon from '@/assets/icons/zoom.svg';
import { UserIcon } from '@/components/UserIcon';

interface StudyRankingListProps {
  rankings: RankResponse[];
  expandedIds: number[];
  onToggleExpand: (studyId: number) => void;
  onStudyClick: (studyId: number) => void;
  scope: 'ALL' | 'MINE';
  onScopeChange: (scope: 'ALL' | 'MINE') => void;
  children?: React.ReactNode;
  isLoading?: boolean;
}

const MemberAvatars = ({
  members,
  limit = 4,
}: {
  members: StudyMemberResponse[];
  limit?: number;
}): React.ReactNode => (
  <div className="flex items-center -space-x-2">
    {members.slice(0, limit).map((m) => {
      const displayImg = m.profileImgThumb || m.profileImg;
      return displayImg ? (
        <img
          key={m.userId}
          src={encodeURI(displayImg)}
          alt={m.nickname}
          className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 object-cover ring-1 ring-slate-100"
          title={m.nickname}
        />
      ) : (
        <div
          key={m.userId}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100"
          title={m.nickname}
        >
          {m.nickname.charAt(0)}
        </div>
      );
    })}
    {members.length > limit && (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100">
        +{members.length - limit}
      </div>
    )}
  </div>
);

export function StudyRankingList({
  rankings,
  expandedIds,
  onToggleExpand,
  onStudyClick,
  scope,
  onScopeChange,
  children,
  isLoading = false,
}: StudyRankingListProps): React.ReactNode {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {children}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar matching Container.svg */}
        <div className="relative group flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ZoomIcon className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="스터디를 검색해보세요."
            className="pl-10 h-12 rounded-xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-primary text-base placeholder:text-gray-400"
          />
        </div>

        {/* Scope Toggle matching Container.svg style */}
        <div className="flex bg-[#F7F8FC] p-1 rounded-lg border border-[#D8DFE4]">
          <button
            onClick={() => onScopeChange('ALL')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all',
              scope === 'ALL'
                ? 'bg-white text-[#040C13] shadow-sm ring-1 ring-black/5'
                : 'text-[#59656E] hover:text-[#040C13]',
            )}
          >
            <TrophyIcon
              className={cn('w-4 h-4', scope === 'ALL' ? 'text-[#E24EA0]' : 'text-[#59656E]')}
            />
            <span>전체 팀</span>
          </button>
          <button
            onClick={() => onScopeChange('MINE')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all',
              scope === 'MINE'
                ? 'bg-white text-[#040C13] shadow-sm ring-1 ring-black/5'
                : 'text-[#59656E] hover:text-[#040C13]',
            )}
          >
            <PeopleIcon
              className={cn('w-4 h-4', scope === 'MINE' ? 'text-[#E24EA0]' : 'text-[#59656E]')}
            />
            <span>내 팀</span>
          </button>
        </div>
      </div>

      {/* Table Header Row */}
      <div className="hidden md:grid grid-cols-[4rem_1fr_5rem_6rem_3rem] gap-4 px-6 py-2 text-sm font-medium text-slate-400">
        <div className="text-center">순위</div>
        <div>팀 이름</div>
        <div className="text-center">인원</div>
        <div className="text-right pr-2">총 점수</div>
        <div></div>
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
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 mb-2">
                <Search className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-slate-500 font-medium">
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
                  className={cn(
                    'group relative flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 overflow-hidden',
                    'hover:shadow-md hover:border-slate-300',
                  )}
                >
                  <div
                    className={cn(
                      'grid grid-cols-[4rem_1fr_5rem_6rem_3rem] gap-4 items-center p-3 cursor-pointer select-none',
                      isExpanded ? 'bg-slate-50/50' : '',
                    )}
                    onClick={() => onToggleExpand(ranking.studyId)}
                  >
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          'text-lg font-black italic',
                          ranking.rank <= 3 ? 'text-slate-800' : 'text-slate-400',
                        )}
                      >
                        {ranking.rank}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-700 truncate text-base group-hover:text-primary transition-colors">
                        {ranking.name}
                      </h3>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full">
                        <span className="text-xs font-bold text-slate-600 tabular-nums">
                          {ranking.memberCount}명
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end pr-2">
                      <div className="text-sm font-bold text-slate-800 tabular-nums">
                        {ranking.totalPoint.toLocaleString()}점
                      </div>
                    </div>
                    <div className="flex justify-center text-slate-300">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2 duration-200">
                      <h4 className="text-sm font-semibold text-slate-500 mb-3 pb-2 border-b border-slate-200">
                        스터디 멤버
                      </h4>
                      <div className="grid gap-3">
                        {ranking.members.map((member) => {
                          const displayImg = member.profileImgThumb || member.profileImg;
                          return (
                            <div
                              key={member.userId}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm"
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
                                  <span className="font-bold text-slate-700 text-sm">
                                    {member.nickname}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-1.5 py-0.5 rounded w-fit',
                                      member.role === 'OWNER'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-slate-100 text-slate-500',
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
