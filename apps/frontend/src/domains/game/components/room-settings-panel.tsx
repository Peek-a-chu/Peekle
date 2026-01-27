'use client';

import { Clock, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RoomSettingsPanelProps {
  timeLimit: number; // 분 단위
  problemCount: number;
  maxPlayers: number;
  tierMin: string;
  tierMax: string;
  tags: string[];
}

export function RoomSettingsPanel({
  timeLimit,
  problemCount,
  maxPlayers,
  tierMin,
  tierMax,
  tags,
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
            <span className="text-xl font-bold text-foreground">{timeLimit}분</span>
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

          {/* 난이도 범위 */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-3">
            <span className="mb-1 text-sm">🎯</span>
            <span className="text-base font-bold text-primary">
              {tierMin} ~ {tierMax}
            </span>
            <span className="text-xs text-muted-foreground">난이도 범위</span>
          </div>
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
