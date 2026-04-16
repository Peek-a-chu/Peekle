'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PastExamCard from './PastExamCard';
import { cn } from '@/lib/utils';
import { CSPastExamYear, fetchCSPastExamCatalog } from '@/domains/cs/api/csApi';

export default function PastExamList() {
  const [openYears, setOpenYears] = useState<number[]>([]);
  const [years, setYears] = useState<CSPastExamYear[]>([]);
  const [loading, setLoading] = useState(true);

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => b.year - a.year),
    [years],
  );

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        const catalog = await fetchCSPastExamCatalog();
        setYears(catalog.years ?? []);
        if ((catalog.years ?? []).length > 0) {
          const latestYear = [...catalog.years].sort((a, b) => b.year - a.year)[0].year;
          setOpenYears([latestYear]);
        }
      } catch (error) {
        console.error('Failed to load past exam catalog:', error);
        toast.error('기출 카탈로그를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const toggleYear = (year: number) => {
    setOpenYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">기출 회차를 불러오는 중...</p>
      </div>
    );
  }

  if (sortedYears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-lg font-bold text-muted-foreground">등록된 기출 회차가 없습니다.</p>
        <p className="text-sm text-muted-foreground/80">관리자 탭에서 연도/회차 스테이지를 먼저 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {sortedYears.map((examData) => {
        const isOpen = openYears.includes(examData.year);
        return (
          <div key={examData.year} className="flex flex-col border border-border/40 rounded-2xl bg-card overflow-hidden">
            <button
              onClick={() => toggleYear(examData.year)}
              className="flex items-center justify-between w-full p-5 bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <h2 className="text-xl font-extrabold">{examData.year}년 기출문제</h2>
              <ChevronDown
                className={cn('w-5 h-5 text-muted-foreground transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-300 ease-in-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-3 p-5 pt-0 bg-muted/10">
                  {examData.rounds.map((roundData) => (
                    <PastExamCard
                      key={`${examData.year}-${roundData.roundNo}`}
                      year={examData.year}
                      round={roundData.roundNo}
                      stageId={roundData.stageId}
                      questionCount={roundData.questionCount}
                      isReady={roundData.isReady}
                      maxSolve={roundData.maxSolve}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
