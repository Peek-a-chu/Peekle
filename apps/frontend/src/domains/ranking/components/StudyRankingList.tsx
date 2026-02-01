'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RankResponse, StudyMemberResponse } from '@/api/rankingApi';
import PeopleIcon from '@/assets/icons/people.svg';
import TrophyIcon from '@/assets/icons/trophy.svg';
import ZoomIcon from '@/assets/icons/zoom.svg';

interface StudyRankingListProps {
  rankings: RankResponse[];
  onStudyClick: (studyId: number) => void;
  scope: 'ALL' | 'MINE';
  onScopeChange: (scope: 'ALL' | 'MINE') => void;
  children?: React.ReactNode;
}

const MemberAvatars = ({
  members,
  limit = 4,
}: {
  members: StudyMemberResponse[];
  limit?: number;
}): React.ReactNode => (
  <div className="flex items-center -space-x-2">
    {members.slice(0, limit).map((m) => (
      <img
        key={m.userId}
        src={m.profileImg || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${m.nickname}`}
        alt={m.nickname}
        className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 object-cover ring-1 ring-slate-100"
        title={m.nickname}
      />
    ))}
    {members.length > limit && (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100">
        +{members.length - limit}
      </div>
    )}
  </div>
);

export function StudyRankingList({
  rankings,
  onStudyClick,
  scope,
  onScopeChange,
  children,
}: StudyRankingListProps): React.ReactNode {
  // State to track expanded item
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
            className="pl-10 h-12 rounded-xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-[#E24EA0] text-base placeholder:text-gray-400"
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

      {/* Table Header Row (Only for ALL scope) */}
      {scope === 'ALL' && (
        <div className="hidden md:grid grid-cols-[4rem_1fr_5rem_6rem_3rem] gap-4 px-6 py-2 text-sm font-medium text-slate-400">
          <div className="text-center">순위</div>
          <div>팀 이름</div>
          <div className="text-center">인원</div>
          <div className="text-right pr-2">총 점수</div>
          <div></div>
        </div>
      )}

      {/* List Items */}
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
            const isExpanded = expandedId === ranking.rank;

            if (scope === 'ALL') {
              // Original List Render (Table-like row)
              return (
                <div
                  key={ranking.rank}
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
                    onClick={() => toggleExpand(ranking.studyId)}
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
                      <h3 className="font-bold text-slate-700 truncate text-base group-hover:text-blue-600 transition-colors">
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
                        {ranking.members.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  member.profileImg ||
                                  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${member.nickname}`
                                }
                                alt={member.nickname}
                                className="h-10 w-10 rounded-full bg-slate-100 border border-slate-100"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-sm">
                                  {member.nickname}
                                </span>
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded w-fit',
                                    member.role === 'OWNER'
                                      ? 'bg-blue-100 text-blue-600'
                                      : 'bg-slate-100 text-slate-500',
                                  )}
                                >
                                  {member.role === 'OWNER' ? 'OWNER' : 'MEMBER'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // MINE Scope: Card Layout
            return (
              <div
                key={ranking.studyId}
                className={cn(
                  'group bg-white rounded-[2rem] border border-slate-200 shadow-sm transition-all duration-200 overflow-hidden',
                  'hover:shadow-md hover:border-slate-300',
                )}
              >
                {/* Header Section: Icon + Title + Chevron */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer select-none border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleExpand(ranking.studyId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                      <TrophyIcon className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-lg text-slate-700 group-hover:text-slate-900">
                      {ranking.name}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-slate-300 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : '',
                    )}
                  >
                    <ChevronDown size={24} />
                  </div>
                </div>

                {/* Stats Grid Section */}
                <div
                  className="grid grid-cols-3 gap-3 px-4 pb-4 pt-4 cursor-pointer"
                  onClick={() => toggleExpand(ranking.studyId)}
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center justify-center py-3 bg-slate-50 rounded-2xl">
                    <span className="text-2xl font-black text-slate-800 mb-1">
                      {ranking.rank}위
                    </span>
                    <span className="text-xs font-bold text-slate-400">전체 순위</span>
                  </div>
                  {/* Score */}
                  <div className="flex flex-col items-center justify-center py-3 bg-slate-50 rounded-2xl">
                    <span className="text-2xl font-black text-slate-800 mb-1">
                      {ranking.totalPoint}
                    </span>
                    <span className="text-xs font-bold text-slate-400">총 점수</span>
                  </div>
                  {/* Members */}
                  <div className="flex flex-col items-center justify-center py-3 bg-slate-50 rounded-2xl">
                    <span className="text-2xl font-black text-slate-800 mb-1">
                      {ranking.memberCount}명
                    </span>
                    <span className="text-xs font-bold text-slate-400">팀원 수</span>
                  </div>
                </div>

                {/* Expanded Details: Member List */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-3">
                        <PeopleIcon className="h-4 w-4" />
                        <span>팀원 목록</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ranking.members.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <img
                              src={
                                member.profileImg ||
                                `https://api.dicebear.com/9.x/pixel-art/svg?seed=${member.nickname}`
                              }
                              alt={member.nickname}
                              className="h-10 w-10 rounded-full bg-white border border-slate-200"
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700 text-sm">
                                  {member.nickname}
                                </span>
                                {member.role === 'OWNER' && (
                                  <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    OWNER
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
