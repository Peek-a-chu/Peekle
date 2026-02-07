import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  type ProblemSource,
  type GameCreationFormData,
} from '@/domains/game/types/game-types';
import { BOJ_TIERS } from '@/domains/game/constants/game-constants';
import { getWorkbooks, type WorkbookListResponse } from '@/domains/workbook/api/workbookApi';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { tagApi, type Tag } from '@/domains/game/api/tagApi';

interface GameCreationStepProblemProps {
  formData: GameCreationFormData;
  onUpdateForm: <K extends keyof GameCreationFormData>(
    key: K,
    value: GameCreationFormData[K],
  ) => void;
  onTagToggle: (tag: string) => void;
}

export function GameCreationStepProblem({
  formData,
  onUpdateForm,
  onTagToggle,
}: GameCreationStepProblemProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [workbooks, setWorkbooks] = useState<WorkbookListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [conflictWorkbookId, setConflictWorkbookId] = useState<string | null>(null);

  // 태그 목록 조회
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await tagApi.getTags();
        setTags(data);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, []);

  // 문제집 목록 조회
  useEffect(() => {
    const fetchWorkbooks = async () => {
      setIsLoading(true);
      try {
        // 일단 상위 50개를 가져와서 클라이언트 필터링
        const response = await getWorkbooks('ALL', undefined, 'LATEST', 0, 50);
        setWorkbooks(response.content);
      } catch (error) {
        console.error('Failed to fetch workbooks:', error);
        toast.error('문제집 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkbooks();
  }, []);

  // 검색어에 따른 문제집 필터링
  const filteredWorkbooks = workbooks.filter((workbook) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      workbook.title.toLowerCase().includes(query) ||
      workbook.description.toLowerCase().includes(query)
    );
  });

  // 문제집 선택 핸들러 (검증 포함)
  const handleWorkbookSelect = (workbookId: string, problemCount: number) => {
    if (problemCount < formData.problemCount) {
      // 충돌 발생: 인라인 경고 표시
      setConflictWorkbookId(workbookId);
    } else {
      // 충돌 없음: 바로 선택
      onUpdateForm('selectedWorkbookId', workbookId);
      setConflictWorkbookId(null);
    }
  };

  // 문제 수 자동 조정 + 선택
  const handleAutoAdjust = (workbookId: string, problemCount: number) => {
    onUpdateForm('problemCount', problemCount);
    onUpdateForm('selectedWorkbookId', workbookId);
    setConflictWorkbookId(null);
    toast.success(`문제 수를 ${problemCount}개로 조정했어요`);
  };

  // 선택 취소
  const handleCancelSelection = () => {
    setConflictWorkbookId(null);
  };

  return (
    <div className="space-y-6 pt-6">
      <Tabs
        value={formData.problemSource}
        onValueChange={(v: string) => onUpdateForm('problemSource', v as ProblemSource)}
      >
        <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-lg border-2 border-muted">
          <TabsTrigger
            value="BOJ_RANDOM"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md transition-all"
          >
            BOJ 랜덤
          </TabsTrigger>
          <TabsTrigger
            value="WORKBOOK"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md transition-all"
          >
            문제집 선택
          </TabsTrigger>
        </TabsList>

        {/* BOJ 랜덤 탭 */}
        <TabsContent value="BOJ_RANDOM" className="space-y-6 mt-4">
          {/* 티어 범위 */}
          <div className="space-y-3">
            <Label>티어 범위</Label>
            <div className="flex items-center gap-4">
              <select
                value={formData.tierMin}
                onChange={(e) => onUpdateForm('tierMin', e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BOJ_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">~</span>
              <select
                value={formData.tierMax}
                onChange={(e) => onUpdateForm('tierMax', e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BOJ_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 태그 선택 */}
          <div className="space-y-3">
            <Label>알고리즘 태그 (선택)</Label>

            {tags.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">태그를 불러오는 중...</div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
                {tags.map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => onTagToggle(tag.key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm transition-colors border',
                      formData.selectedTags.includes(tag.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-muted',
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {formData.selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                선택된 태그: {formData.selectedTags.map(key => tags.find(t => t.key === key)?.name || key).join(', ')}
              </p>
            )}
          </div>
        </TabsContent>

        {/* 문제집 선택 탭 */}
        <TabsContent value="WORKBOOK" className="space-y-4 mt-4">
          {/* 검색창 추가 */}
          <Input
            placeholder="문제집 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 relative min-h-[100px]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorkbooks.length > 0 ? (
              filteredWorkbooks.map((workbook) => {
                const isConflict = conflictWorkbookId === String(workbook.id);
                const isSelected = formData.selectedWorkbookId === String(workbook.id);

                return (
                  <div key={workbook.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleWorkbookSelect(String(workbook.id), workbook.problemCount)}
                      className={cn(
                        'w-full rounded-lg border p-4 text-left transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : isConflict
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                            : 'border-border hover:border-primary/50',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{workbook.title}</h4>
                          <p className="text-sm text-muted-foreground">{workbook.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{workbook.problemCount}문제</span>
                          <p className="text-xs text-muted-foreground">by {workbook.creator.nickname}</p>
                        </div>
                      </div>
                    </button>

                    {/* 충돌 경고 & 해결 옵션 */}
                    {isConflict && (
                      <div className="rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                              선택한 문제집은 {workbook.problemCount}문제만 포함해요
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                              현재 설정은 {formData.problemCount}문제예요. 어떻게 할까요?
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAutoAdjust(String(workbook.id), workbook.problemCount)}
                            className="flex-1"
                          >
                            문제 수를 {workbook.problemCount}개로 줄이고 선택
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCancelSelection}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {workbooks.length === 0 ? '등록된 문제집이 없습니다.' : '검색 결과가 없습니다.'}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
