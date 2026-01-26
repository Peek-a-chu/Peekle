import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  BOJ_TIERS,
  BOJ_TAGS,
  mockWorkbooks,
  type ProblemSource,
  type GameCreationFormData,
} from '@/domains/game/mocks/mock-data';

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
            <div className="flex flex-wrap gap-2">
              {BOJ_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagToggle(tag)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm transition-colors',
                    formData.selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
            {formData.selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                선택된 태그: {formData.selectedTags.join(', ')}
              </p>
            )}
          </div>
        </TabsContent>

        {/* 문제집 선택 탭 */}
        <TabsContent value="WORKBOOK" className="space-y-4 mt-4">
          <div className="space-y-3">
            {mockWorkbooks.map((workbook) => (
              <button
                key={workbook.id}
                type="button"
                onClick={() => onUpdateForm('selectedWorkbookId', workbook.id)}
                className={cn(
                  'w-full rounded-lg border p-4 text-left transition-colors',
                  formData.selectedWorkbookId === workbook.id
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
                    <p className="text-xs text-muted-foreground">by {workbook.creator}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
