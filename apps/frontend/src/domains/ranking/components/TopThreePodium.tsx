'use client';

import { Trophy, Medal, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RankResponse, StudyMemberResponse } from '@/api/rankingApi';

interface TopThreePodiumProps {
  rankings: RankResponse[];
  onStudyClick: (studyId: number) => void;
}

const MemberAvatars = ({
  members,
  limit = 3,
}: {
  members: StudyMemberResponse[];
  limit?: number;
}): React.ReactNode => (
  <div className="flex items-center justify-center -space-x-2">
    {members.slice(0, limit).map((m) => {
      const displayImg = m.profileImgThumb || m.profileImg;
      return (
        <img
          key={m.userId}
          src={displayImg ? encodeURI(displayImg) : '/avatars/default.png'}
          alt={m.nickname}
          className="h-6 w-6 rounded-full border-2 border-background bg-muted"
          title={m.nickname}
        />
      );
    })}
    {members.length > limit && (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold">
        +{members.length - limit}
      </div>
    )}
  </div>
);

export function TopThreePodium({ rankings, onStudyClick }: TopThreePodiumProps): React.ReactNode {
  const first = rankings[0];
  const second = rankings[1];
  const third = rankings[2];

  return (
    <div className="flex items-end justify-center gap-1.5 min-h-[80px] transform scale-40 origin-top">
      {/* 2nd Place - Left */}
      <div className="flex flex-col items-center group">
        {second ? (
          <Card
            className={cn(
              'w-40 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-visible z-10',
              'bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200',
            )}
            onClick={() => onStudyClick(second.studyId)}
          >
            <div className="absolute -top-4 w-full flex justify-center">
              <div className="bg-slate-500 text-white rounded-full p-2 shadow-lg ring-4 ring-white transition-transform group-hover:scale-110">
                <Medal className="h-5 w-5" />
              </div>
            </div>
            <CardContent className="pt-8 pb-4 px-3 text-center">
              <h3 className="mb-1.5 font-bold text-base text-foreground line-clamp-1">
                {second.name}
              </h3>
              <div className="mb-2">
                <MemberAvatars members={second.members} />
              </div>
              <div className="space-y-1 text-xs bg-slate-200/50 rounded-lg p-1.5">
                <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
                  <Trophy className="h-3 w-3" />
                  <span>{second.totalPoint.toLocaleString()} 점</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center" />
        )}

        {/* Podium Step 2 */}
        <div className="relative flex flex-col items-center -mt-2">
          {/* Connection bit */}
          <div className="w-32 h-3 bg-slate-300 transform perspective-[500px] rotate-x-12" />
          <div className="w-40 h-20 bg-gradient-to-t from-slate-400 to-slate-200 rounded-t-sm shadow-lg flex items-center justify-center border-t border-slate-100 relative z-0">
            <span className="text-4xl font-black text-slate-500/20 select-none">2</span>
          </div>
        </div>
      </div>

      {/* 1st Place - Center (Tallest) */}
      <div className="flex flex-col items-center z-20 group -mx-2 mb-2">
        {first ? (
          <Card
            className={cn(
              'w-48 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-visible',
              'bg-gradient-to-b from-yellow-50 to-yellow-100 border-yellow-200 ring-2 ring-yellow-400/30',
            )}
            onClick={() => onStudyClick(first.studyId)}
          >
            <div className="absolute -top-5 w-full flex justify-center">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full p-2.5 shadow-lg ring-4 ring-white transition-transform group-hover:scale-110">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <CardContent className="pt-8 pb-5 px-3 text-center">
              <h3 className="mb-1.5 font-bold text-lg text-foreground line-clamp-1">
                {first.name}
              </h3>
              <div className="mb-2">
                <MemberAvatars members={first.members} />
              </div>
              <div className="space-y-1 text-xs bg-yellow-200/50 rounded-lg p-1.5">
                <div className="flex items-center justify-center gap-1 font-bold text-yellow-700">
                  <Trophy className="h-3 w-3" />
                  <span>{first.totalPoint.toLocaleString()} 점</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-yellow-200 rounded-lg bg-yellow-50/50 text-yellow-300">
            <Trophy className="h-8 w-8 opacity-50" />
          </div>
        )}
        {/* Podium Step 1 */}
        <div className="relative flex flex-col items-center -mt-2">
          <div className="w-40 h-3 bg-yellow-300 transform perspective-[500px] rotate-x-12" />
          <div className="w-48 h-28 bg-gradient-to-t from-yellow-400 to-yellow-200 rounded-t-sm shadow-[0_10px_30px_-10px_rgba(234,179,8,0.5)] flex items-center justify-center border-t border-yellow-100 relative z-0">
            <span className="text-6xl font-black text-yellow-600/20 select-none">1</span>
          </div>
        </div>
      </div>

      {/* 3rd Place - Right */}
      <div className="flex flex-col items-center group">
        {third ? (
          <Card
            className={cn(
              'w-40 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-visible z-10',
              'bg-gradient-to-b from-orange-50 to-orange-100 border-orange-200',
            )}
            onClick={() => onStudyClick(third.studyId)}
          >
            <div className="absolute -top-4 w-full flex justify-center">
              <div className="bg-orange-500 text-white rounded-full p-2 shadow-lg ring-4 ring-white transition-transform group-hover:scale-110">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <CardContent className="pt-8 pb-4 px-3 text-center">
              <h3 className="mb-1.5 font-bold text-base text-foreground line-clamp-1">
                {third.name}
              </h3>
              <div className="mb-2">
                <MemberAvatars members={third.members} />
              </div>
              <div className="space-y-1 text-xs bg-orange-200/50 rounded-lg p-1.5">
                <div className="flex items-center justify-center gap-1 font-bold text-orange-700">
                  <Trophy className="h-3 w-3" />
                  <span>{third.totalPoint.toLocaleString()} 점</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center" />
        )}
        {/* Podium Step 3 */}
        <div className="relative flex flex-col items-center -mt-2">
          <div className="w-32 h-3 bg-orange-300 transform perspective-[500px] rotate-x-12" />
          <div className="w-40 h-14 bg-gradient-to-t from-orange-400 to-orange-200 rounded-t-sm shadow-lg flex items-center justify-center border-t border-orange-100 relative z-0">
            <span className="text-4xl font-black text-orange-600/20 select-none">3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
