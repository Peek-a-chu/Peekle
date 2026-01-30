'use client';

import { useState } from 'react';
import { ExternalLink, Users, Gamepad2, FileText, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react';
import Link from 'next/link';
import { TimelineItemData, BOJ_TIER_NAMES, BOJ_TIER_COLORS } from '../mocks/dashboardMocks';


interface TimelineItemProps {
  items: TimelineItemData[];
  onSelect: (item: TimelineItemData) => void;
  selectedItemId?: string;
}

const TimelineItem = ({ items, onSelect, selectedItemId }: TimelineItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 데이터가 없으면 렌더링 안 함
  if (!items || items.length === 0) return null;

  // 첫 번째 항목을 메인으로 사용 (가장 최신)
  const mainItem = items[0];
  const { problemId, title, tier, tierLevel, link } = mainItem;

  const hasMultiple = items.length > 1;

  // 날짜 포맷팅 (YYYY-MM-DD HH:mm)
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="border border-border rounded-lg mb-2 overflow-hidden bg-card transition-all hover:border-primary/50">
      {/* 1. Accordion Header (Summary Line) */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => hasMultiple && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          {/* 문제 정보 */}
          <span className="text-sm text-muted-foreground w-16 shrink-0 font-mono">#{problemId}</span>
          <span className="font-bold text-foreground truncate max-w-[200px]" title={title}>{title}</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold border text-muted-foreground shrink-0"
            style={{ borderColor: BOJ_TIER_COLORS[tier], color: BOJ_TIER_COLORS[tier] }}
          >
            {BOJ_TIER_NAMES[tier]} {tierLevel}
          </span>

          {/* 백준 링크 (헤더에 상시 노출) */}
          <Link
            href={link}
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md"
            title="백준 문제 보러가기"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* 요약 배지 (최신 기록 기준) */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border">
            {hasMultiple && (
              <span className="font-bold text-primary mr-1 border-r border-border pr-2">
                {items.length} submissions
              </span>
            )}
            {mainItem.memory && <span>{mainItem.memory}KB</span>}
            {mainItem.executionTime && <span>{mainItem.executionTime}ms</span>}
            {mainItem.language && <span className="font-mono text-[10px] uppercase border-l pl-2 ml-1 border-border">{mainItem.language}</span>}
          </div>

          {/* 확장 토글 아이콘 */}
          {hasMultiple ? (
            <div className="p-1 text-muted-foreground">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          ) : (
            // 단일 항목일 경우 바로 상세보기 버튼 노출
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(mainItem);
              }}
              className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
              title="풀이 상세 보기"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Expanded Table (Submission List) */}
      {isExpanded && hasMultiple && (
        <div className="border-t border-border bg-muted/10 animate-in slide-in-from-top-1 duration-200">
          <div className="w-full text-sm">
            <div className="grid grid-cols-[1fr_80px_80px_80px_140px_40px] gap-2 px-4 py-2 border-b border-border/50 text-muted-foreground text-xs font-medium">
              <div>태그/출처</div>
              <div>언어</div>
              <div>메모리</div>
              <div>시간</div>
              <div>제출일시</div>
              <div className="text-center">상세</div>
            </div>
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-[1fr_80px_80px_80px_140px_40px] gap-2 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0
                            ${selectedItemId === item.submittedAt ? 'bg-primary/5' : ''}
                        `}
              >
                {/* 태그 */}
                <div className="truncate">
                  {item.tag ? (
                    <div className="flex items-center gap-1.5 text-primary text-xs font-medium truncate" title={item.tag}>
                      {item.sourceType === 'study' ? <Users className="w-3 h-3 shrink-0" /> : <Gamepad2 className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{item.tag}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </div>

                {/* 언어 */}
                <div className="font-mono text-xs uppercase text-foreground/80">{item.language}</div>

                {/* 메모리 */}
                <div className="text-xs">{item.memory ? `${item.memory}KB` : '-'}</div>

                {/* 시간 */}
                <div className="text-xs">{item.executionTime ? `${item.executionTime}ms` : '-'}</div>

                {/* 제출일시 */}
                <div className="text-xs text-muted-foreground">{formatDateTime(item.submittedAt)}</div>

                {/* 상세 버튼 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => onSelect(item)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="상세 보기"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineItem;
