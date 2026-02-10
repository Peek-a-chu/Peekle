'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2, BookOpen, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchExternalProblems, ExternalProblem } from '../api/problemApi';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { DailyProblem } from '@/domains/study/types';
import {
  getWorkbooks,
  getWorkbook,
  WorkbookListResponse,
  WorkbookResponse,
} from '@/domains/workbook/api/workbookApi';

interface SearchResult extends ExternalProblem {
  isRegistered?: boolean;
  hasSubmissions?: boolean;
  registeredId?: number; // problemId for registered problems
}

interface CCAddProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    title: string,
    number: number | null,
    tags?: string[],
    problemId?: number,
    date?: string,
    customLink?: string,
  ) => Promise<void>;
  onRemove: (problemId: number, studyProblemId?: number) => Promise<void>;
  currentProblems?: DailyProblem[]; // 현재 스터디에 추가된 문제 목록
}

export function CCAddProblemModal({
  isOpen,
  onClose,
  onAdd,
  onRemove,
  currentProblems = [],
}: CCAddProblemModalProps): React.ReactNode {
  const [activeTab, setActiveTab] = useState<'problem' | 'workbook' | 'custom'>('problem');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<SearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Problem State
  const [customTitle, setCustomTitle] = useState('');
  const [customLink, setCustomLink] = useState('');

  const debouncedQuery = useDebounce(query, 300);

  const [workbookQuery, setWorkbookQuery] = useState('');
  const [workbookTab, setWorkbookTab] = useState<'MY' | 'BOOKMARKED' | 'ALL'>('MY');
  const debouncedWorkbookQuery = useDebounce(workbookQuery, 300);
  const [workbooks, setWorkbooks] = useState<WorkbookListResponse[]>([]);
  const [workbookCounts, setWorkbookCounts] = useState<{
    MY?: number;
    BOOKMARKED?: number;
    ALL?: number;
  }>({});
  const [isWorkbookLoading, setIsWorkbookLoading] = useState(false);
  const [workbookDetail, setWorkbookDetail] = useState<WorkbookResponse | null>(null);
  const [isWorkbookDetailOpen, setIsWorkbookDetailOpen] = useState(false);
  const [isWorkbookDetailLoading, setIsWorkbookDetailLoading] = useState(false);
  const [workbookSubmittingId, setWorkbookSubmittingId] = useState<number | null>(null);
  const [selectedWorkbookProblemIds, setSelectedWorkbookProblemIds] = useState<Set<number>>(
    new Set(),
  );

  // Reset state when modal is closed or opened
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedProblem(null);
      setIsSubmitting(false);
      setActiveTab('problem');
      setWorkbookQuery('');
      setWorkbookTab('MY');
      setWorkbooks([]);
      setWorkbookCounts({});
      setWorkbookDetail(null);
      setIsWorkbookDetailOpen(false);
      setIsWorkbookDetailLoading(false);
      setWorkbookSubmittingId(null);
      setSelectedWorkbookProblemIds(new Set());
      setCustomTitle('');
      setCustomLink('');
    }
  }, [isOpen]);

  // ... (existing useEffects for search and workbook) ...

  if (!isOpen) return null;

  const handleSubmit = async (): Promise<void> => {
    if (activeTab === 'custom') {
      if (!customTitle.trim()) {
        toast.error('문제 제목을 입력해주세요.');
        return;
      }
      // Link is optional but recommended? Spec said customLink is nullable but let's encourage it.
      // If requirement says link is optional, we proceed.

      setIsSubmitting(true);
      try {
        console.log(`[Adding Custom Problem] ${customTitle}`);
        await onAdd(customTitle, null, [], undefined, undefined, customLink); // Pass customLink
        setCustomTitle('');
        setCustomLink('');
        onClose();
      } catch (error) {
        console.error(error);
        toast.error('작업 수행 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!selectedProblem) return;

    // [Validation] If trying to delete a problem that has submissions
    if (selectedProblem.isRegistered && selectedProblem.hasSubmissions) {
      toast.error('문제를 삭제할 수 없습니다', {
        description: '이미 풀이 이력이 존재하는 문제입니다.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedProblem.isRegistered && selectedProblem.registeredId) {
        await onRemove(selectedProblem.registeredId);
      } else {
        console.log(`[Adding Problem] ${selectedProblem.title} (#${selectedProblem.number})`);
        // 검색 결과에서 problemId를 받았으면 직접 사용, 없으면 number(externalId)로 조회
        await onAdd(
          selectedProblem.title,
          selectedProblem.number,
          selectedProblem.tags,
          selectedProblem.problemId, // problemId가 있으면 전달
        );
      }
      setQuery('');
      setResults([]);
      setSelectedProblem(null);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('작업 수행 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      // Don't close to allow adding more? Or close?
      // onClose(); -> Spec says we might search again.
    }
  };

  const isProblemAlreadyAdded = (problemId?: number, externalId?: string | number) => {
    return currentProblems.some(
      (p) =>
        (problemId && p.problemId === problemId) ||
        (externalId && p.externalId === String(externalId)),
    );
  };

  // ... (existing workbook handlers) ...
  const handleOpenWorkbookDetail = async (workbookId: number) => {
    // ... same implementation ...
    setIsWorkbookDetailOpen(true);
    setIsWorkbookDetailLoading(true);
    try {
      const detail = await getWorkbook(workbookId);
      setWorkbookDetail(detail);
      const selectable = (detail.problems ?? []).filter(
        (p) => !isProblemAlreadyAdded(p.id, p.number),
      );
      setSelectedWorkbookProblemIds(new Set(selectable.map((p) => p.id)));
    } catch (error) {
      console.error('Failed to load workbook detail:', error);
      toast.error('문제집 상세를 불러오지 못했습니다.');
      setIsWorkbookDetailOpen(false);
    } finally {
      setIsWorkbookDetailLoading(false);
    }
  };

  const handleAddWorkbookProblems = async (
    workbookId: number,
    mode: 'all' | 'selected' = 'selected',
  ) => {
    // ... same implementation ...
    setWorkbookSubmittingId(workbookId);
    try {
      const detail = workbookDetail?.id === workbookId ? workbookDetail : await getWorkbook(workbookId);
      const problems = detail.problems ?? [];

      if (problems.length === 0) {
        toast.info('문제집에 문제가 없습니다.');
        return;
      }

      const addableProblems = problems.filter((p) => !isProblemAlreadyAdded(p.id, p.number));
      const problemsToAdd =
        mode === 'all' || selectedWorkbookProblemIds.size === 0
          ? addableProblems
          : problems.filter((p) => selectedWorkbookProblemIds.has(p.id));

      if (problemsToAdd.length === 0) {
        toast.info('추가할 문제가 없습니다.');
        return;
      }

      for (const p of problemsToAdd) {
        await onAdd(p.title, p.number, [], p.id);
      }

      toast.success(`${problemsToAdd.length}개의 문제가 추가되었습니다.`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('문제집 추가 중 오류가 발생했습니다.');
    } finally {
      setWorkbookSubmittingId(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-background text-foreground p-6 rounded-lg w-full max-w-md shadow-lg border border-border flex flex-col max-h-[80vh]">
        <h3 className="font-semibold text-lg mb-1">문제 검색 및 추가</h3>
        <p className="text-sm text-muted-foreground mb-4">
          문제 검색 또는 문제집에서 한 번에 추가할 수 있습니다.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Button
            type="button"
            variant={activeTab === 'problem' ? 'default' : 'outline'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setActiveTab('problem')}
          >
            문제 검색
          </Button>
          <Button
            type="button"
            variant={activeTab === 'workbook' ? 'default' : 'outline'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setActiveTab('workbook')}
          >
            문제집
          </Button>
          <Button
            type="button"
            variant={activeTab === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setActiveTab('custom')}
          >
            직접 추가
          </Button>
        </div>

        {activeTab === 'problem' ? (
          <>
            {/* ... Problem Search UI ... */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="문제 번호 또는 제목 검색 (예: 1753)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedProblem(null); // Reset selection on new search
                }}
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] flex flex-col mb-4">
              {isLoading ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  검색 중...
                </div>
              ) : results.length > 0 ? (
                <ul className="divide-y divide-border">
                  {results.map((problem) => (
                    <li
                      key={problem.externalId || problem.number}
                      onClick={() => setSelectedProblem(problem)}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-accent transition-colors flex justify-between items-center',
                        selectedProblem?.number === problem.number &&
                        'bg-primary/5 ring-1 ring-primary ring-inset',
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">
                          <span className="text-primary mr-2 font-mono">#{problem.number}</span>
                          {problem.title}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {problem.isRegistered && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              등록됨
                            </span>
                          )}
                          {problem.tags?.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedProblem?.number === problem.number && (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </li>
                  ))}
                </ul>
              ) : query ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
                  <div className="rounded-full bg-muted p-4">
                    <Search className="h-8 w-8 opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">검색 결과가 없습니다</p>
                    <p className="text-xs mt-1">
                      &apos;{query}&apos;에 대한 문제를 찾을 수 없습니다.
                      <br />
                      문제 번호나 정확한 제목을 입력해보세요.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-6">
                  <div className="flex gap-4 opacity-30">
                    <div
                      className="h-16 w-3 bg-primary/20 rounded-full animate-pulse"
                      style={{ animationDelay: '0s' }}
                    />
                    <div
                      className="h-24 w-3 bg-primary/20 rounded-full animate-pulse"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-10 w-3 bg-primary/20 rounded-full animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="h-20 w-3 bg-primary/20 rounded-full animate-pulse"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">함께 풀 문제를 찾아보세요</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      백준 문제 번호(예: 1000) 또는
                      <br />
                      알고리즘 분류(예: DP, 그래프)를 검색하세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'workbook' ? (
          <>
            {/* ... Workbook UI ... */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                variant={workbookTab === 'MY' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setWorkbookTab('MY')}
              >
                내 문제집
                {typeof workbookCounts.MY === 'number' && (
                  <span className="ml-1 text-xs opacity-70">{workbookCounts.MY}</span>
                )}
              </Button>
              <Button
                type="button"
                variant={workbookTab === 'BOOKMARKED' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setWorkbookTab('BOOKMARKED')}
              >
                북마크
                {typeof workbookCounts.BOOKMARKED === 'number' && (
                  <span className="ml-1 text-xs opacity-70">{workbookCounts.BOOKMARKED}</span>
                )}
              </Button>
              <Button
                type="button"
                variant={workbookTab === 'ALL' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setWorkbookTab('ALL')}
              >
                공개
                {typeof workbookCounts.ALL === 'number' && (
                  <span className="ml-1 text-xs opacity-70">{workbookCounts.ALL}</span>
                )}
              </Button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="문제집 검색..."
                value={workbookQuery}
                onChange={(e) => setWorkbookQuery(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] flex flex-col mb-4">
              {isWorkbookLoading ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  불러오는 중...
                </div>
              ) : workbooks.length > 0 ? (
                <ul className="divide-y divide-border">
                  {workbooks.map((workbook) => (
                    <li
                      key={workbook.id}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{workbook.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {workbook.problemCount}개 문제
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => void handleOpenWorkbookDetail(workbook.id)}
                        >
                          자세히보기
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => void handleAddWorkbookProblems(workbook.id, 'all')}
                          disabled={workbookSubmittingId !== null}
                        >
                          {workbookSubmittingId === workbook.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              전체 추가
                            </>
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
                  <div className="rounded-full bg-muted p-4">
                    <BookOpen className="h-8 w-8 opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">문제집이 없습니다</p>
                    <p className="text-xs mt-1">검색어를 바꿔보세요.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Custom Tab */
          <div className="flex flex-col flex-1 p-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">문제 제목 <span className="text-destructive">*</span></label>
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="예: 프로그래머스 - 신고 결과 받기"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">문제 링크</label>
                <input
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  placeholder="https://school.programmers.co.kr/..."
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  프로그래머스 등 외부 문제 링크를 입력해주세요.
                </p>
              </div>
            </div>
            <div className="flex-1" />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-auto pt-2 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          {(activeTab === 'problem' || activeTab === 'custom') && (
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || (activeTab === 'problem' && !selectedProblem)}
              variant={activeTab === 'problem' && selectedProblem?.isRegistered ? 'destructive' : 'default'}
              className={cn(
                'text-white',
                !(activeTab === 'problem' && selectedProblem?.isRegistered) && 'bg-primary hover:bg-primary/90',
              )}
            >
              {isSubmitting
                ? '처리 중...'
                : activeTab === 'problem' && selectedProblem?.isRegistered
                  ? '선택한 문제 삭제'
                  : '추가하기'}
            </Button>
          )}
        </div>
      </div>

      {/* ... Workbook Detail Modal ... */}
      {isWorkbookDetailOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          {/* ... same implementation ... */}
          <div className="bg-background text-foreground rounded-lg w-full max-w-lg shadow-xl border border-border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  {workbookDetail?.title || '문제집 상세'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWorkbookDetailOpen(false)}
              >
                닫기
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {isWorkbookDetailLoading ? (
                <div className="flex items-center justify-center text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  불러오는 중...
                </div>
              ) : workbookDetail?.problems?.length ? (
                <>
                  <div className="mb-3 text-xs text-muted-foreground">
                    추가 가능{' '}
                    <span className="font-semibold text-foreground">
                      {
                        workbookDetail.problems.filter(
                          (p) => !isProblemAlreadyAdded(p.id, p.number),
                        ).length
                      }
                    </span>
                    개 / 이미 추가{' '}
                    <span className="font-semibold text-foreground">
                      {
                        workbookDetail.problems.filter((p) =>
                          isProblemAlreadyAdded(p.id, p.number),
                        ).length
                      }
                    </span>
                    개
                  </div>
                  <ul className="space-y-2">
                    {workbookDetail.problems.map((p) => {
                      const alreadyAdded = isProblemAlreadyAdded(p.id, p.number);
                      const isChecked = selectedWorkbookProblemIds.has(p.id);
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            'flex items-center justify-between rounded-md border border-border p-3 text-sm',
                            alreadyAdded && 'bg-muted/40',
                          )}
                        >
                          <label className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              disabled={alreadyAdded}
                              checked={!alreadyAdded && isChecked}
                              onChange={(e) => {
                                setSelectedWorkbookProblemIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) {
                                    next.add(p.id);
                                  } else {
                                    next.delete(p.id);
                                  }
                                  return next;
                                });
                              }}
                            />
                            <span className="min-w-0">
                              <span className="font-mono text-primary mr-2">#{p.number}</span>
                              <span className="truncate">{p.title}</span>
                            </span>
                          </label>
                          {alreadyAdded && (
                            <span className="text-[10px] text-muted-foreground">이미 추가됨</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  문제집에 문제가 없습니다.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-xs text-muted-foreground">
                체크된 문제만 추가됩니다. (이미 추가된 문제 제외)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!workbookDetail?.problems?.length) return;
                    const selectable = workbookDetail.problems.filter(
                      (p) => !isProblemAlreadyAdded(p.id, p.number),
                    );
                    const allSelected = selectable.every((p) =>
                      selectedWorkbookProblemIds.has(p.id),
                    );
                    setSelectedWorkbookProblemIds(
                      allSelected ? new Set() : new Set(selectable.map((p) => p.id)),
                    );
                  }}
                  disabled={!workbookDetail?.problems?.length}
                >
                  {workbookDetail?.problems?.length &&
                    workbookDetail.problems
                      .filter((p) => !isProblemAlreadyAdded(p.id, p.number))
                      .every((p) => selectedWorkbookProblemIds.has(p.id))
                    ? '전체 해제'
                    : '전체 선택'}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    workbookDetail && void handleAddWorkbookProblems(workbookDetail.id, 'selected')
                  }
                  disabled={!workbookDetail || workbookSubmittingId !== null}
                >
                  {workbookSubmittingId === workbookDetail?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '선택한 문제 추가'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
