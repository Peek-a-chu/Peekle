'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ExternalLink, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAIRecommendations } from '../hooks/useDashboardData';
import { BOJ_TIER_NAMES, BOJ_TIER_COLORS } from '../mocks/dashboardMocks';
import { Button } from '@/components/ui/button';

import { AIRecommendationData } from '../mocks/dashboardMocks';
import { AddToWorkbookModal } from '@/domains/workbook/components/AddToWorkbookModal';

interface AIRecommendationProps {
  initialData?: AIRecommendationData[];
}

const AIRecommendation = ({ initialData }: AIRecommendationProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: fetchedData, isLoading } = useAIRecommendations({
    skip: !!initialData,
    refreshKey,
  });
  const data = initialData || fetchedData || [];

  // 로딩 중이거나 초기 데이터가 없는 경우의 처리
  const showLoading = !initialData && isLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!showLoading) {
      setCanRetry(false);
      return;
    }

    const timer = setTimeout(() => {
      setCanRetry(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [showLoading]);

  const handleRetry = () => {
    setCanRetry(false);
    setRefreshKey(Date.now());
  };

  const handleOpenModal = (id: string, title: string) => {
    setSelectedProblem({ id, title });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold text-foreground">AI 추천 문제</h3>
          <p className="text-xs text-muted-foreground">나에게 맞는 문제 추천</p>
        </div>
      </div>

      {/* 추천 문제 목록 */}
      <div className="space-y-4 h-full flex flex-col justify-center">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              AI가 문제를 생성 중이에요...
            </p>
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={handleRetry}
                disabled={!canRetry}
              >
                재요청
              </Button>
              {!canRetry && (
                <span className="text-[10px] text-muted-foreground">30초 후 활성화됩니다.</span>
              )}
            </div>
          </div>
        ) : data.length > 0 ? (
          data.map((item) => (
            <div
              key={item.problemId}
              className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
            >
              {/* 문제 정보 */}
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">{item.problemId}</span>
                <span className="text-sm font-semibold text-foreground truncate" title={item.title}>
                  {item.title}
                </span>
              </div>

              {/* 티어 & 태그 */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* 백준 티어 태그 */}
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold border text-muted-foreground shrink-0"
                  style={{
                    borderColor: BOJ_TIER_COLORS[item.tier] || '#828282',
                    color: BOJ_TIER_COLORS[item.tier] || '#828282',
                  }}
                >
                  {BOJ_TIER_NAMES[item.tier] || 'Unknown'} {item.tierLevel}
                </span>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-muted-foreground/20 rounded-full text-xs text-foreground/80 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 추천 이유 */}
              <p className="text-[15px] text-muted-foreground mb-4">💡 {item.reason}</p>

              {/* 버튼들 */}
              <div className="flex flex-col items-stretch gap-2">
                <Link
                  href={`https://www.acmicpc.net/problem/${item.problemId.replace('#', '')}`}
                  target="_blank"
                  className="w-full"
                >
                  <Button className="h-8 w-full px-2.5 text-xs gap-1 bg-primary hover:bg-primary">
                    <ExternalLink className="w-3 h-3" />
                    풀러가기
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="h-8 w-full px-2.5 text-xs gap-1 border-border"
                  onClick={() => handleOpenModal(item.problemId, item.title)}
                >
                  <Plus className="w-3 h-3" />
                  문제집에 추가
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            추천할 수 있는 문제가 없습니다. <br /> 더 많은 문제를 풀어보세요!
          </div>
        )}
      </div>
      {selectedProblem && (
        <AddToWorkbookModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          problemBojId={selectedProblem.id}
          problemTitle={selectedProblem.title}
        />
      )}
    </div>
  );
};

export default AIRecommendation;
