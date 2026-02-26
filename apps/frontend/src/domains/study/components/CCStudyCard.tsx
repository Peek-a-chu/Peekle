'use client';

import { Users, Crown, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { UserIcon } from '@/components/UserIcon';
import type { StudyListContent } from '@/domains/study/types';
import { useAuthStore } from '@/store/auth-store';

interface CCStudyCardProps {
  study: StudyListContent;
  isOwner?: boolean;
  onClick?: () => void;
  className?: string;
  rank?: number; // 랭킹 순위 (옵셔널, 없으면 표시 안 함)
}

export function CCStudyCard({
  study,
  isOwner = false,
  onClick,
  className,
  rank,
}: CCStudyCardProps) {
  const { user } = useAuthStore();
  const displayRank = rank ?? study.rank;
  const rankingPoint = study.rankingPoint ?? 0;

  // 현재 사용자가 방장인지 확인 (owner.id와 현재 사용자 ID 비교)
  const isCurrentUserOwner = user && study.owner && user.id === study.owner.id;

  // 디버깅: study 객체 확인
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[CCStudyCard] Study data:', {
      id: study.id,
      title: study.title,
      rankingPoint: study.rankingPoint,
      owner: study.owner,
      isCurrentUserOwner,
    });
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Header: Rank Badge, Owner Badge, and Title */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* 랭킹 번호 배지 */}
            {displayRank !== undefined && (
              <Badge className="shrink-0 bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                #{displayRank}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="bg-primary/15 text-primary font-bold border-primary/40 dark:bg-primary/20 dark:text-primary-foreground"
            >
              스터디 점수: {rankingPoint}
            </Badge>
          </div>
        </div>

        {/* 스터디 점수 배지 */}
        <div className="flex flex-row items-center gap-2 mb-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-w-0">
            {study.title}
          </h3>
          {/* 현재 사용자가 방장인지 확인하고 배지 표시 */}
          {isCurrentUserOwner && (
            <Badge
              variant="secondary"
              className="shrink-0 gap-1 bg-muted text-foreground font-bold border-border"
            >
              <Crown className="h-3 w-3" />
              방장
            </Badge>
          )}
          {/* Member Count */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{study.memberCount}명</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {study.description && (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{study.description}</p>
        )}

        {study.owner && (
          <div className="mb-4 flex items-center gap-2">
            <UserIcon
              src={study.owner.profileImage}
              nickname={study.owner.nickname}
              size={24}
              className="border-border"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-muted-foreground truncate">{study.owner.nickname}</span>
            </div>
          </div>
        )}

        {/* User Icon Pile - Online Participants */}
        {study.profileImages && study.profileImages.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {study.profileImages.slice(0, 3).map((img, idx) => (
                <UserIcon
                  key={idx}
                  src={img}
                  nickname={`Participant ${idx + 1}`}
                  size={32}
                  className="border-2 border-background"
                />
              ))}
            </div>
            {study.memberCount > 3 && (
              <span className="text-xs text-muted-foreground">+{study.memberCount - 3}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
