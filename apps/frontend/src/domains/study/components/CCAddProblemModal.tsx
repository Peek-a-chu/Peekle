'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchExternalProblems } from '@/app/api/problemApi';
import { useDebounce } from '@/hooks/useDebounce';

interface CCAddProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, number: number, tags?: string[]) => Promise<void>;
  onRemove: (problemId: number) => Promise<void>;
}

export function CCAddProblemModal({ isOpen, onClose, onAdd, onRemove }: CCAddProblemModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const data = await searchExternalProblems(debouncedQuery);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedProblem) return;

    setIsSubmitting(true);
    try {
      if (selectedProblem.isRegistered && selectedProblem.registeredId) {
        await onRemove(selectedProblem.registeredId);
      } else {
        await onAdd(selectedProblem.title, selectedProblem.number, selectedProblem.tags);
      }
      setQuery('');
      setResults([]);
      setSelectedProblem(null);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-background p-6 rounded-lg w-full max-w-md shadow-lg border border-border flex flex-col max-h-[80vh]">
        <h3 className="font-semibold text-lg mb-1">문제 검색 및 추가</h3>
        <p className="text-sm text-muted-foreground mb-4">
          문제 번호 또는 제목으로 검색하여 선택하세요.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
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
                  key={problem.number}
                  onClick={() => setSelectedProblem(problem)}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-accent transition-colors flex justify-between items-center",
                    selectedProblem?.number === problem.number && "bg-accent/50 ring-1 ring-primary inset-0"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">
                      <span className="text-primary mr-2 font-mono">#{problem.number}</span>
                      {problem.title}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                       {problem.isRegistered && (
                         <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">등록됨</span>
                       )}
                       {problem.tags?.map((tag: string) => (
                         <span key={tag} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
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
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              검색 결과가 없습니다.
            </div>
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              검색어를 입력하세요.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-auto pt-2 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedProblem}
            variant={selectedProblem?.isRegistered ? "destructive" : "default"}
            className={cn(
              "text-white", 
              !selectedProblem?.isRegistered && "bg-pink-500 hover:bg-pink-600"
            )}
          >
            {isSubmitting ? '처리 중...' : selectedProblem?.isRegistered ? '선택한 문제 삭제' : '선택한 문제 추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
