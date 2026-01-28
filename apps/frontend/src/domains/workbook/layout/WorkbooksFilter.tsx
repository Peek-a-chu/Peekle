'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { WorkbookTab, WorkbookSort } from '../types';

interface WorkbooksFilterProps {
  tab: WorkbookTab;
  onTabChange: (tab: WorkbookTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: WorkbookSort;
  onSortChange: (sort: WorkbookSort) => void;
  tabCounts: { all: number; my: number; bookmarked: number };
  className?: string;
}

const TAB_OPTIONS: { value: WorkbookTab; label: string; countKey: keyof WorkbooksFilterProps['tabCounts'] }[] = [
  { value: 'ALL', label: '전체', countKey: 'all' },
  { value: 'MY', label: '내 문제집', countKey: 'my' },
  { value: 'BOOKMARKED', label: '즐겨찾기', countKey: 'bookmarked' },
];

const SORT_OPTIONS: { value: WorkbookSort; label: string }[] = [
  { value: 'LATEST', label: '최신 순' },
  { value: 'OLDEST', label: '오래된 순' },
  { value: 'BOOKMARKS', label: '인기 순' },
  { value: 'PROBLEMS', label: '문제 수 순' },
];

export function WorkbooksFilter({
  tab,
  onTabChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  tabCounts,
  className,
}: WorkbooksFilterProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || '최신순';

  return (
    <div className={cn('space-y-4', className)}>
      {/* 탭 */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {TAB_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onTabChange(option.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === option.value
                ? 'bg-background text-pink-500 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
            <Badge
              variant="secondary"
              className={cn(
                'h-5 min-w-5 px-1.5 text-[10px]',
                tab === option.value ? 'bg-pink-100 text-pink-600' : ''
              )}
            >
              {tabCounts[option.countKey]}
            </Badge>
          </button>
        ))}
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex items-center justify-between gap-3">
        {/* 검색바 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="문제집 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 정렬 드롭다운 */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors"
          >
            {currentSortLabel}
            <ChevronDown className={cn('h-4 w-4 transition-transform', isSortOpen && 'rotate-180')} />
          </button>

          {isSortOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-md shadow-lg z-10">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setIsSortOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                    sortBy === option.value && 'text-pink-500 font-medium'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
