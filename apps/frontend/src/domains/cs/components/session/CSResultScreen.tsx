'use client';

import React from 'react';
import { CSAttemptCompleteResponse } from '@/domains/cs/api/csApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Flame, CheckCircle, RotateCcw, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CSResultScreenProps {
  result: CSAttemptCompleteResponse;
  isPastExam: boolean;
  returnPath: string;
}

export default function CSResultScreen({ result, isPastExam, returnPath }: CSResultScreenProps) {
  const router = useRouter();

  const handleReturnToCS = () => {
    router.replace(returnPath);
  };

  const handleNextStage = () => {
    if (result.nextStageId) {
      router.replace(`/cs/stage/${result.nextStageId}`);
    }
  };

  return (
    <div className="w-[calc(100%+2rem)] -mx-4 sm:w-full sm:mx-auto flex-1 flex flex-col items-center justify-center sm:max-w-lg py-0 sm:py-12 animate-in fade-in zoom-in px-0 sm:px-4 min-h-[100dvh] sm:min-h-[80vh]">
      <Card className="isolate w-full min-h-[100dvh] sm:min-h-0 border-none shadow-none sm:shadow-xl bg-background/90 sm:bg-background/50 sm:backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-start sm:justify-center px-6 pt-[max(5.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-8 text-center rounded-none sm:rounded-3xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/25 to-transparent sm:inset-0 sm:h-auto sm:from-primary/10 z-0" />

        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 relative">
            <Trophy className="w-12 h-12 text-primary" />
            {result.correctRate >= 80 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg rotate-12">
                Excellent!
              </div>
            )}
          </div>

          <h1 className="text-3xl font-extrabold mb-2 text-foreground tracking-tight">스테이지 완료!</h1>
          <p className="text-muted-foreground mb-8">
            정답률 <span className="font-bold text-primary">{result.correctRate}%</span> ({result.correctCount}문제 정답)
          </p>

          {result.streakEarnedToday && (
            <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl p-4 flex items-center justify-center gap-3 mb-8 animate-pulse">
              <Flame className="w-6 h-6 fill-amber-500" />
              <span className="font-bold">오늘 스트릭 획득! (진행 중: {result.currentStreak}일)</span>
            </div>
          )}

          <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-2xl p-4 flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="font-bold">이번 세션 점수</span>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-lg">+{result.earnedScore}점</div>
              <div className="text-xs text-emerald-700/80">누적 {result.totalScore}점</div>
            </div>
          </div>
          {isPastExam && typeof result.maxSolve === 'number' && (
            <div className="w-full bg-primary/10 border border-primary/20 text-primary rounded-2xl p-3 mb-8">
              최고 기록: {result.maxSolve}문제 정답
            </div>
          )}

          <div className="flex flex-col w-full gap-3">
            {isPastExam ? (
              <Button
                variant="outline"
                className="w-full h-14 text-lg font-bold rounded-2xl"
                onClick={handleReturnToCS}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                기출 목록으로 돌아가기
              </Button>
            ) : result.isTrackCompleted ? (
              <Button
                className="w-full h-14 text-lg font-bold rounded-2xl"
                onClick={handleReturnToCS}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                트랙 완료 (학습 맵으로)
              </Button>
            ) : (
              <>
                {result.nextStageId && (
                  <Button
                    className="w-full h-14 text-lg font-bold rounded-2xl"
                    onClick={handleNextStage}
                  >
                    다음 스테이지 풀기
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-14 text-lg font-bold rounded-2xl"
                  onClick={handleReturnToCS}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  목록으로 돌아가기
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
