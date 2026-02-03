'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { SubmissionHistory } from '../types';
import { X } from 'lucide-react';
import { CCCalendarWidget, CCInlineCalendar } from '../../study/components/CCCalendarWidget';
import { startOfToday, format, parse } from 'date-fns';

interface Props {
  initialHistory: SubmissionHistory[];
}

export function CCHistoryList({ initialHistory }: Props) {
  // console.log('CCHistoryList initialHistory:', initialHistory); // Debug log can be removed if verified
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionHistory | null>(null);

  // Initialize filter state from URL
  const [filterDate, setFilterDate] = useState(searchParams.get('date') || '');
  const [filterTier, setFilterTier] = useState(searchParams.get('tier') || '전체');
  const [filterSource, setFilterSource] = useState(searchParams.get('sourceType') || 'ALL');

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Extract dates from history for calendar dots
  const historyDates = useMemo(() => {
    return initialHistory
      .map(h => {
        // submittedAt might be string ISO or formatted string. 
        // Based on history.ts, `timestamp` is formatted string, but we don't have raw date object readily available in `initialHistory` item type 
        // unless we modify the type or use current timestamp string to parse.
        // However, `initialHistory` in component props has `timestamp` as string.
        // Wait, `history.ts` maps `formattedDate` to `timestamp`.
        // Ideally we should pass raw dates if possible, or try to parse `timestamp` "2024. 01. 01. 12:00".
        // Let's safe guard.
        try {
          // "2024. 01. 29. 12:00" format
          const parts = h.timestamp.split('. ');
          if (parts.length >= 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }
          return new Date(); // fallback
        } catch (e) { return null; }
      })
      .filter((d): d is Date => d !== null);
  }, [initialHistory]);

  // Helper to get Date object from filterDate string (YYYY-MM-DD)
  const selectedDateObj = useMemo(() => {
    if (!filterDate) return startOfToday();
    try {
      return new Date(filterDate);
    } catch {
      return startOfToday();
    }
  }, [filterDate]);


  // Fixed width for the side panel matching Workbook page style approximately
  const PANEL_WIDTH = 480;

  // URL query params 처리 (submissionId) 및 필터 상태 동기화
  useEffect(() => {
    const submissionId = searchParams.get('submissionId');
    if (submissionId) {
      const target = initialHistory.find((h) => String(h.id) === submissionId);
      if (target) {
        setSelectedSubmission(target);
      }
    } else {
      setSelectedSubmission(null);
    }

    // Sync local state if URL changes externally (e.g. back button)
    setFilterDate(searchParams.get('date') || '');
    setFilterTier(searchParams.get('tier') || '전체');
    setFilterSource(searchParams.get('sourceType') || 'ALL');

  }, [searchParams, initialHistory]);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== '전체' && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // 페이지네이션이 있다면 page=0으로 초기화해야 함
    // params.set('page', '0'); 
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setFilterDate(dateStr);
    updateFilters('date', dateStr);
    setIsCalendarOpen(false);
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setFilterTier(newVal);
    updateFilters('tier', newVal);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setFilterSource(newVal);
    updateFilters('sourceType', newVal);
  };

  const handleResetFilters = () => {
    setFilterDate('');
    setFilterTier('전체');
    setFilterTier('전체');
    setFilterSource('ALL');
    // reset status via URL replacement below (params.delete loop or explicit)
    // Actually handleResetFilters just calls replace(pathname) so URL is cleared.
    // We just need to ensure local state (if any) is cleared.
    // CCHistoryList uses URL as source of truth mostly, but `filterTier` etc are local states synced.
    // Let's ensure new state is synced if we add one.
    // Wait, I didn't add `filterStatus` state variable yet. I used searchParams directly in the select value above.
    // To be consistent, I should add state or just use updateFilters.
    // The previous code block used `searchParams.get('status')` directly.
    router.replace(pathname);
    setIsCalendarOpen(false);
  };

  const handleSelectSubmission = (item: SubmissionHistory) => {
    setSelectedSubmission(item);
    // URL 업데이트
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('submissionId', String(item.id));
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleClosePanel = () => {
    setSelectedSubmission(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('submissionId');
    window.history.pushState({}, '', newUrl.toString());
  };

  // Mock Filters
  const tiers = ['전체', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby'];
  const sources = [
    { label: '전체', value: 'ALL' },
    { label: '스터디', value: 'STUDY' },
    { label: '게임', value: 'GAME' },
    { label: '혼자 풀기', value: 'SOLO' },
  ];

  return (
    <div className="mx-auto max-w-[1920px] px-4 py-8 relative">
      {/* relative for calendar popover context if needed, though usually popover is near trigger */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <div
          className={`h-[calc(100vh-120px)] flex flex-col transition-all duration-300 ease-in-out ${selectedSubmission ? 'pr-[480px]' : ''}`}
        >
          {/* 1. Header & Filters */}
          <div className="flex-none mb-6 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-muted rounded-full transition text-muted-foreground hover:text-foreground"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">풀이 내역 조회</h1>
                <p className="text-muted-foreground text-sm">내가 푼 문제들의 기록을 확인하세요</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm relative z-20">
              {/* ... Filters ... */}
              <div className="flex flex-col gap-1.5 w-full md:w-auto relative">
                <label className="text-xs font-semibold text-muted-foreground">기간</label>
                <CCCalendarWidget
                  selectedDate={selectedDateObj}
                  isOpen={isCalendarOpen}
                  onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="border border-input rounded-lg h-9 px-3 w-[150px] justify-between"
                />

                {isCalendarOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2">
                    <CCInlineCalendar
                      selectedDate={selectedDateObj}
                      onSelectDate={handleDateSelect}
                      historyDates={historyDates}
                      className="border-0 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 w-32">
                <label className="text-xs font-semibold text-muted-foreground">티어</label>
                <select
                  value={filterTier}
                  onChange={handleTierChange}
                  className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background cursor-pointer h-9"
                >
                  {tiers.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-32">
                <label className="text-xs font-semibold text-muted-foreground">풀이 장소</label>
                <select
                  value={filterSource}
                  onChange={handleSourceChange}
                  className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background cursor-pointer h-9"
                >
                  {sources.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-32">
                <label className="text-xs font-semibold text-muted-foreground">상태</label>
                <select
                  value={searchParams.get('status') || 'ALL'}
                  onChange={(e) => updateFilters('status', e.target.value)}
                  className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background cursor-pointer h-9"
                >
                  <option value="ALL">전체</option>
                  <option value="SUCCESS">성공</option>
                  <option value="FAIL">실패</option>
                </select>
              </div>

              <button
                onClick={handleResetFilters}
                className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
              >
                <span>🚿</span> 초기화
              </button>
            </div>
          </div>

          {/* 2. Main Content - List */}
          <div className="flex-1 wspace-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {/* List Header Count */}
            <p className="text-sm font-medium text-muted-foreground mb-2">
              총 {initialHistory.length}개의 기록
            </p>

            {initialHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSubmission(item)}
                className={`bg-card border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group
                          ${selectedSubmission?.id === item.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'}
                      `}
              >
                {/* Item Content */}
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                              ${item.isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                  >
                    {item.isSuccess ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground text-md">
                        {item.problemId}. {item.problemTitle}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white
                                      ${item.tier.includes('Bronze')
                            ? 'bg-amber-700'
                            : item.tier.includes('Silver')
                              ? 'bg-slate-400'
                              : 'bg-yellow-500' // Gold etc
                          }`}
                      >
                        {item.tier}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{item.language}</span>
                      <span>•</span>
                      <span>{item.memory}</span>
                      <span>•</span>
                      <span>{item.time}</span>

                      <span className={`ml-1 font-bold ${item.isSuccess ? 'text-green-600' : 'text-red-500'}`}>
                        {item.isSuccess ? '성공' : (item.result?.replace(/\n/g, ' ') || '실패')}
                      </span>

                      {item.sourceType !== 'SOLO' && (
                        <span className="ml-1 px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                          {item.sourceType === 'STUDY' ? '스터디' : item.sourceDetail || '게임'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground mb-3">{item.timestamp}</p>
                  <span className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-primary transition-opacity">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Side Panel (Fixed position) */}
        {selectedSubmission && (
          <div
            className="fixed top-0 right-0 bottom-0 w-[480px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-in-out"
          >
            {/* Panel Header */}
            <div className="p-5 border-b border-border flex items-start justify-between bg-muted/10 shrink-0">
              <div>
                <h2 className="font-bold text-lg text-foreground line-clamp-1">
                  {selectedSubmission.problemId}. {selectedSubmission.problemTitle}
                </h2>
                <div className="flex gap-2 text-xs mt-1 items-center">
                  <span
                    className={`${selectedSubmission.isSuccess ? 'text-green-500' : 'text-red-500'} font-bold px-2 py-0.5 bg-muted rounded-md border border-border`}
                  >
                    {selectedSubmission.isSuccess ? '성공' : (selectedSubmission.result?.replace(/\n/g, ' ') || '실패')}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{selectedSubmission.timestamp}</span>
                </div>
              </div>
              <button
                onClick={handleClosePanel}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Area */}
            <div className="flex-1 overflow-hidden relative group bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={selectedSubmission.language.toLowerCase()}
                theme="vs-dark"
                value={selectedSubmission.code || '// 코드를 불러올 수 없습니다.'}
                options={{
                  readOnly: true,
                  fontFamily: "'D2Coding', 'Fira Code', Consolas, monospace",
                  fontSize: 14,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 16 },
                }}
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigator.clipboard.writeText(selectedSubmission.code || '')}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700 hover:bg-zinc-700 shadow-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10 shrink-0">
              <a
                href={`https://www.acmicpc.net/problem/${selectedSubmission.problemId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex justify-center items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm"
              >
                백준에서 문제 보기 ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
