'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CSPastExamYear, fetchCSPastExamCatalog } from '@/domains/cs/api/csApi';
import CsStageEditor from '@/domains/admin/components/CsStageEditor';

export default function CsPastExamEditorTab() {
  const [loading, setLoading] = useState(true);
  const [catalogYears, setCatalogYears] = useState<CSPastExamYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const sortedYears = useMemo(
    () => [...catalogYears].sort((a, b) => b.year - a.year),
    [catalogYears],
  );

  const currentYearData = useMemo(
    () => sortedYears.find((year) => year.year === selectedYear) ?? null,
    [selectedYear, sortedYears],
  );

  const currentRoundData = useMemo(
    () => currentYearData?.rounds.find((round) => round.roundNo === selectedRound) ?? null,
    [currentYearData, selectedRound],
  );

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        const catalog = await fetchCSPastExamCatalog();
        const years = catalog.years ?? [];
        setCatalogYears(years);
        if (years.length > 0) {
          const latestYear = [...years].sort((a, b) => b.year - a.year)[0];
          setSelectedYear(latestYear.year);
          setSelectedRound(latestYear.rounds[0]?.roundNo ?? null);
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

  useEffect(() => {
    if (!currentYearData) return;
    if (selectedRound === null || !currentYearData.rounds.some((round) => round.roundNo === selectedRound)) {
      setSelectedRound(currentYearData.rounds[0]?.roundNo ?? null);
    }
  }, [currentYearData, selectedRound]);

  const stageId = currentRoundData?.stageId ?? null;
  const isReady = Boolean(currentRoundData?.isReady);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">기출 탭을 준비하고 있습니다...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-xl">정보처리기사 기출 문제 관리</CardTitle>
        <CardDescription>연도/회차를 선택해 문제를 추가하거나 수정하세요.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-muted-foreground">연도</span>
              <select
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={selectedYear ?? ''}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {sortedYears.map((year) => (
                  <option key={year.year} value={year.year}>
                    {year.year}년
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-muted-foreground">회차</span>
              <select
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={selectedRound ?? ''}
                onChange={(event) => setSelectedRound(Number(event.target.value))}
              >
                {(currentYearData?.rounds ?? []).map((round) => (
                  <option key={round.roundNo} value={round.roundNo}>
                    {round.roundNo}회차
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            <p>
              선택됨: <span className="font-bold">{selectedYear ?? '-'}년 {selectedRound ?? '-'}회차</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              등록 문제 수: <span className="font-semibold text-foreground">{currentRoundData?.questionCount ?? 0}개</span>
            </p>
          </div>

          {!stageId ? (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              이 회차의 스테이지가 아직 생성되지 않았습니다.
            </div>
          ) : !isReady ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-primary">
              아직 등록된 문제가 없습니다. 아래 편집기에서 바로 문제를 등록할 수 있습니다.
            </div>
          ) : null}

          {stageId && (
            <div className="pt-1">
              <CsStageEditor
                stageId={stageId}
                maxQuestionCount={20}
                exactQuestionCount={null}
              />
            </div>
          )}

          {!stageId && (
            <div className="flex justify-end">
              <Button variant="outline" disabled>
                스테이지가 없어 편집 불가
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
