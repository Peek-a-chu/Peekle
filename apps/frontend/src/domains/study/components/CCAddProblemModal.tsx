'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchExternalProblems, ExternalProblem } from '../api/problemApi';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { DailyProblem } from '@/domains/study/types';

interface SearchResult extends ExternalProblem {
  isRegistered?: boolean;
  hasSubmissions?: boolean;
  registeredId?: number; // problemId for registered problems
}

interface CCAddProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, number: number, tags?: string[], problemId?: number) => Promise<void>;
  onRemove: (problemId: number) => Promise<void>;
  currentProblems?: DailyProblem[]; // 현재 스터디에 추가된 문제 목록
}

export function CCAddProblemModal({
  isOpen,
  onClose,
  onAdd,
  onRemove,
  currentProblems = [],
}: CCAddProblemModalProps): React.ReactNode {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<SearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Reset state when modal is closed or opened
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedProblem(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const search = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const data = await searchExternalProblems(debouncedQuery);

        // 현재 스터디에 추가된 문제와 비교하여 등록 여부 확인
        const enrichedResults: SearchResult[] = data.map((problem) => {
          // externalId 또는 problemId로 비교
          const isRegistered = currentProblems.some(
            (p) =>
              p.problemId === problem.problemId ||
              p.externalId === problem.externalId ||
              p.externalId === String(problem.number),
          );

          const registeredProblem = currentProblems.find(
            (p) =>
              p.problemId === problem.problemId ||
              p.externalId === problem.externalId ||
              p.externalId === String(problem.number),
          );

          return {
            ...problem,
            isRegistered,
            registeredId: registeredProblem?.problemId,
            hasSubmissions: registeredProblem
              ? (registeredProblem.solvedMemberCount ?? 0) > 0
              : false,
          };
        });

        setResults(enrichedResults);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void search();
  }, [debouncedQuery, currentProblems]);

  if (!isOpen) return null;

  const handleSubmit = async (): Promise<void> => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-background text-foreground p-6 rounded-lg w-full max-w-md shadow-lg border border-border flex flex-col max-h-[80vh]">
        <h3 className="font-semibold text-lg mb-1">문제 검색 및 추가</h3>
        <p className="text-sm text-muted-foreground mb-4">
          문제 번호 또는 제목으로 검색하여 선택하세요.
        </p>

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

        <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
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

        <div className="flex justify-end gap-2 mt-auto pt-2 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !selectedProblem}
            variant={selectedProblem?.isRegistered ? 'destructive' : 'default'}
            className={cn(
              'text-white',
              !selectedProblem?.isRegistered && 'bg-primary hover:bg-primary/90',
            )}
          >
            {isSubmitting
              ? '처리 중...'
              : selectedProblem?.isRegistered
                ? '선택한 문제 삭제'
                : '선택한 문제 추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
