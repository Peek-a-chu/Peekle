'use client';

import { Trophy, Medal, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankResponse, StudyMemberResponse } from '@/api/rankingApi';

interface TopThreePodiumProps {
  rankings: RankResponse[];
  onStudyClick: (studyId: number) => void;
}

const MemberIcons = ({
  members,
  limit = 3,
}: {
  members: StudyMemberResponse[];
  limit?: number;
}): React.ReactNode => (
  <div className="flex items-center justify-center -space-x-2">
    {members.slice(0, limit).map((m) => {
      const displayImg = m.profileImgThumb || m.profileImg;
      return displayImg ? (
        <img
          key={m.userId}
          src={encodeURI(displayImg)}
          alt={m.nickname}
          className="h-6 w-6 rounded-full border-2 border-background bg-muted"
          title={m.nickname}
        />
      ) : (
        <div
          key={m.userId}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-slate-500"
          title={m.nickname}
        >
          {m.nickname.charAt(0)}
        </div>
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
  const cards = [
    first ? { ...first, place: 1 } : null,
    second ? { ...second, place: 2 } : null,
    third ? { ...third, place: 3 } : null,
  ].filter(Boolean) as Array<RankResponse & { place: 1 | 2 | 3 }>;

  const placeMeta: Record<1 | 2 | 3, { label: string; icon: React.ReactNode; badgeClass: string }> =
    {
      1: {
        label: '1위',
        icon: <Trophy className="h-3.5 w-3.5" />,
        badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      2: {
        label: '2위',
        icon: <Medal className="h-3.5 w-3.5" />,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      },
      3: {
        label: '3위',
        icon: <Award className="h-3.5 w-3.5" />,
        badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
      },
    };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((item) => {
          const meta = placeMeta[item.place];
          return (
            <button
              key={item.studyId}
              onClick={() => onStudyClick(item.studyId)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                'border-slate-200 bg-white hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/40',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
                    meta.badgeClass,
                  )}
                >
                  <span className="sr-only">{item.place}</span>
                  {meta.icon}
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {item.memberCount}명
                </span>
              </div>
              <p className="truncate text-sm font-bold text-slate-800 dark:text-card-foreground">
                {item.name}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <MemberIcons members={item.members} />
                <span className="text-sm font-bold text-slate-800 dark:text-foreground">
                  {item.totalPoint.toLocaleString()}점
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
