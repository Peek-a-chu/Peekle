import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  type ProblemSource,
  type GameCreationFormData,
} from '@/domains/game/types/game-types';
import { BOJ_TIERS } from '@/domains/game/constants/game-constants';
import { getWorkbooks, type WorkbookListResponse } from '@/domains/workbook/api/workbookApi';
import { Loader2 } from 'lucide-react';
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
              filteredWorkbooks.map((workbook) => (
                <button
                  key={workbook.id}
                  type="button"
                  onClick={() => onUpdateForm('selectedWorkbookId', String(workbook.id))}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    formData.selectedWorkbookId === String(workbook.id)
                      ? 'border-primary bg-primary/5'
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
              ))
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
