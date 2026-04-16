'use client';

import { AlertCircle, Play, BookX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PastExamCardProps {
  year: number;
  round: number;
  stageId: number | null;
  questionCount: number;
  isReady: boolean;
  maxSolve?: number | null;
}

export default function PastExamCard({
  year,
  round,
  stageId,
  questionCount,
  isReady,
  maxSolve,
}: PastExamCardProps) {
  const router = useRouter();

  const handleStart = () => {
    if (!stageId || !isReady) return;
    router.push(`/cs/stage/${stageId}?source=past-exam&year=${year}&round=${round}`);
  };

  const handleWrongNote = () => {
    if (!stageId) return;
    router.push(`/cs/wrong-problems?scope=past-exam&year=${year}&round=${round}&stageId=${stageId}`);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-card border border-border/50 shadow-sm rounded-xl hover:border-primary/40 transition-colors gap-4">
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="font-bold text-primary">{round}회</span>
        </div>
        <div>
          <h3 className="text-lg font-bold">{year}년 {round}회 정보처리기사 기출</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-medium">
            {isReady ? (
              <span>{questionCount}문항 등록</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                문제 미등록
              </span>
            )}
            {isReady && typeof maxSolve === 'number' && (
              <span className="text-primary/80">최고 {maxSolve}문제 정답</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleStart} disabled={!isReady || !stageId} className="gap-2 font-bold h-10">
          <Play className="w-4 h-4 fill-current" />
          풀기
        </Button>
        <Button
          onClick={handleWrongNote}
          disabled={!stageId}
          variant="outline"
          className="gap-2 font-bold h-10 border-rose-500/30 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
        >
          <BookX className="w-4 h-4" />
          오답노트
        </Button>
      </div>

    </div>
  );
}
