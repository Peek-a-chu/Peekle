'use client';

import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useTimeline } from '../hooks/useDashboardData';
import TimelineItem from './TimelineItem';

interface LearningTimelineProps {
    selectedDate: string | null;
}

const LearningTimeline = ({ selectedDate }: LearningTimelineProps) => {
    const { data } = useTimeline(selectedDate || '');
    const [expanded, setExpanded] = useState(false);

    // 기본 5개, 확장 시 전체
    const displayedItems = expanded ? data : data.slice(0, 5);
    const hasMore = data.length > 5;

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-6 transition-colors duration-300">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                    <h3 className="font-bold text-foreground">
                        {selectedDate ? `${formatDate(selectedDate)} 학습 타임라인` : '학습 타임라인'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        총 {data.length}개 문제
                    </p>
                </div>
            </div>

            {/* 타임라인 목록 */}
            <div className="divide-y divide-border">
                {displayedItems.length > 0 ? (
                    displayedItems.map((item, index) => (
                        <TimelineItem key={`${item.problemId}-${index}`} data={item} />
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">
                        {selectedDate ? '해당 날짜에 풀이한 문제가 없습니다.' : '날짜를 선택해주세요.'}
                    </p>
                )}
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
                            {data.length - 5}개 더 보기
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default LearningTimeline;
