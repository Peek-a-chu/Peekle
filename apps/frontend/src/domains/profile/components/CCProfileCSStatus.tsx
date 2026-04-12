'use client';

import React from 'react';
import { UserProfile } from '../types';
import { BookX, GraduationCap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Props {
  user: UserProfile;
}

export function CCProfileCSStatus({ user }: Props) {
  const router = useRouter();
  const hasLearningDomains = user.csProgressList && user.csProgressList.length > 0;

  return (
    <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 transition-all duration-300 hover:shadow-md hover:shadow-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4" />
          현재 CS 학습 상태
        </h3>
        
        {hasLearningDomains ? (
          <div className="flex flex-wrap gap-2">
            {user.csProgressList!.map((progress, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-xl shadow-sm"
              >
                <span className="text-sm font-bold text-foreground tracking-tight">
                  {progress.domainName}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold whitespace-nowrap">
                  레벨 {progress.trackNo}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mt-1">
              <BookX className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                아직 시작한 CS 도메인이 없습니다
              </span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {user.isMe ? 'CS 지식을 쌓고 약점을 보완해보세요!' : `${user.nickname}님은 아직 CS 학습 기록이 없습니다.`}
            </p>
          </div>
        )}
      </div>

      {!hasLearningDomains && user.isMe && (
        <Button
          onClick={() => router.push('/cs')}
          className="w-full sm:w-auto rounded-xl h-10 px-5 font-bold shadow-sm shrink-0"
        >
          CS 학습 시작하기
          <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
        </Button>
      )}
    </div>
  );
}
