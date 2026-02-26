'use client';

import { Clock, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GameProblem } from '@/domains/game/types/game-types';

interface RoomSettingsPanelProps {
  timeLimit: number; // 분 단위
  problemCount: number;
  maxPlayers: number;
  tierMin: string;
  tierMax: string;
  tags: string[];
  problems?: GameProblem[];
  workbookTitle?: string;
}

export function RoomSettingsPanel({
  timeLimit,
  problemCount,
  maxPlayers,
  tierMin,
  tierMax,
  tags,
  problems,
  workbookTitle,
}: RoomSettingsPanelProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-medium">현재 방 설정</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {/* 설정 카드 그리드 */}
        <div className="mb-3 grid grid-cols-4 gap-2">
          {/* 제한 시간 */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-3">
            <Clock className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold text-foreground">{Math.floor(timeLimit / 60)}분</span>
            <span className="text-xs text-muted-foreground">제한 시간</span>
          </div>

          {/* 문제 수 */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-3">
            <FileText className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold text-foreground">{problemCount}</span>
            <span className="text-xs text-muted-foreground">문제 수</span>
          </div>

          {/* 최대 인원 */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-3">
            <Users className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold text-foreground">{maxPlayers}</span>
            <span className="text-xs text-muted-foreground">최대 인원</span>
          </div>

          {/* 난이도 범위 / 문제집 - 호버 시 문제 목록 툴팁 */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help flex-col items-center justify-center rounded-lg border border-border bg-background p-3">
                  <span className="mb-1 text-sm">🎯</span>
                  {workbookTitle ? (
                    <>
                      <span className="text-base font-bold text-primary line-clamp-1 text-center px-1">
                        {workbookTitle}
                      </span>
                      <span className="text-xs text-muted-foreground">문제집</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-bold text-primary">
                        {tierMin} ~ {tierMax}
                      </span>
                      <span className="text-xs text-muted-foreground">난이도 범위</span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              {((problems && problems.length > 0) || !workbookTitle) && (
                <TooltipContent side="bottom" className="max-w-md">
                  {!workbookTitle && (
                    <div className={problems && problems.length > 0 ? "mb-3 border-b pb-2" : ""}>
                      <p className="font-semibold mb-2 text-sm">포함된 태그</p>
                      {tags && tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">모든 태그 (전체 랜덤)</p>
                      )}
                    </div>
                  )}

                  {problems && problems.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold mb-2">문제 목록</p>
                      {problems.map((problem, idx) => (
                        <div key={problem.id} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <span className="flex-1">{problem.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {problem.tier}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 태그 */}
        <div className="flex gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="dark:text-zinc-900">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
