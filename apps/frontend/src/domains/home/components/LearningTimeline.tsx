'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { useTimeline } from '../hooks/useDashboardData';
import { TimelineItemData } from '../mocks/dashboardMocks';
import TimelineItem from './TimelineItem';

interface LearningTimelineProps {
  selectedDate: string | null;
  showHistoryLink?: boolean;
  nickname?: string;
  initialData?: TimelineItemData[];
}

const LearningTimeline = ({
  selectedDate,
  showHistoryLink = false,
  nickname,
  initialData,
}: LearningTimelineProps) => {
  const { data: fetchedData } = useTimeline(selectedDate || '', nickname, { skip: !!initialData });
  const data = initialData || fetchedData;
  const [expanded, setExpanded] = useState(false);

  // 문제 ID별 그룹화 (중복 문제 하나로 합치기)
  const groupedDataMap = data.reduce(
    (acc, item) => {
      if (!acc[item.problemId]) {
        acc[item.problemId] = [];
      }
      acc[item.problemId].push(item);
      return acc;
    },
    {} as Record<string, typeof data>,
  );

  // 각 그룹 내에서 정답(AC)을 최우선으로, 그 다음 최신순으로 정렬
  Object.keys(groupedDataMap).forEach((problemId) => {
    groupedDataMap[problemId].sort((a, b) => {
      // 1. 정답 여부로 먼저 정렬 (정답이 먼저)
      // 1. 정답 여부로 먼저 정렬 (정답이 먼저)
      const aIsSuccess = a.isSuccess ?? false;
      const bIsSuccess = b.isSuccess ?? false;

      if (aIsSuccess !== bIsSuccess) {
        return bIsSuccess ? 1 : -1;
      }
      // 2. 같은 성공 상태면 최신순으로 정렬
      if (a.submittedAt && b.submittedAt) {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      return 0;
    });
  });

  const groupedKeys = Object.keys(groupedDataMap);

  const router = useRouter(); // Added router initialization

  // 기본 5개 그룹, 확장 시 전체
  const displayedKeys = expanded ? groupedKeys : groupedKeys.slice(0, 5);
  const hasMore = groupedKeys.length > 5;

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleSelect = (item: TimelineItemData) => {
    if (nickname && item.submissionId) {
      router.push(`/profile/${nickname}/history?submissionId=${item.submissionId}`);
    }
  };

  return (
    <div className="p-6 transition-colors duration-300 relative">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold text-foreground">
            {selectedDate ? `${formatDate(selectedDate)} 학습 타임라인` : '학습 타임라인'}
          </h3>
          <p className="text-xs text-muted-foreground">총 {data.length}개 문제</p>
        </div>

        {showHistoryLink && nickname && (
          <Link
            href={`/profile/${nickname}/history`}
            className="ml-auto text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-muted flex items-center gap-1"
          >
            <span className="text-xs font-medium">풀이 내역 조회</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        )}
      </div>

      <div className="flex gap-6 relative">
        {/* 타임라인 목록 */}
        <div className="w-full transition-all duration-300">
          {displayedKeys.length > 0 ? (
            displayedKeys.map((problemId) => (
              <TimelineItem
                key={problemId}
                items={groupedDataMap[problemId]}
                onSelect={handleSelect}
                isMe={showHistoryLink}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {selectedDate ? '해당 날짜에 풀이한 문제가 없습니다.' : '날짜를 선택해주세요.'}
            </p>
          )}
        </div>
      </div>

      {/* 더보기/접기 버튼 */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full mt-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {groupedKeys.length - 5}개 더 보기
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default LearningTimeline;
