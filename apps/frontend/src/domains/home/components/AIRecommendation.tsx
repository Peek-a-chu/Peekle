'use client';

import { Sparkles, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAIRecommendations } from '../hooks/useDashboardData';
import { BOJ_TIER_NAMES, BOJ_TIER_COLORS } from '../mocks/dashboardMocks';
import { Button } from '@/components/ui/button';

import { AIRecommendationData } from '../mocks/dashboardMocks';

interface AIRecommendationProps {
  initialData?: AIRecommendationData[];
}

const AIRecommendation = ({ initialData }: AIRecommendationProps) => {
  const { data: fetchedData, isLoading } = useAIRecommendations({ skip: !!initialData });
  const data = initialData || fetchedData;

  // 로딩 중이거나 초기 데이터가 없는 경우의 처리
  const showLoading = !initialData && isLoading;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold text-foreground">AI 추천 문제</h3>
          <p className="text-xs text-muted-foreground">나에게 맞는 문제 추천</p>
        </div>
      </div>

      {/* 추천 문제 목록 */}
      <div className="space-y-4">
        {showLoading ? (
          // 로딩 스켈레톤
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/10 rounded-xl border border-border/30 animate-pulse h-[140px]" />
          ))
        ) : data.length > 0 ? (
          data.map((item) => (
            <div
              key={item.problemId}
              className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
            >
              {/* 문제 정보 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">{item.problemId}</span>
                <span className="font-medium text-foreground">{item.title}</span>
              </div>

              {/* 티어 & 태그 */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
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
              <p className="text-[14px] text-muted-foreground mb-3">💡 {item.reason}</p>

              {/* 버튼들 */}
              <div className="flex items-center gap-2">
                <Link
                  href={`https://www.acmicpc.net/problem/${item.problemId.replace('#', '')}`}
                  target="_blank"
                >
                  <Button className="h-8 px-2.5 text-xs gap-1 bg-primary hover:bg-primary">
                    <ExternalLink className="w-3 h-3" />
                    풀러가기
                  </Button>
                </Link>
                <Button variant="outline" className="h-8 px-2.5 text-xs gap-1 border-border">
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
    </div>
  );
};

export default AIRecommendation;
