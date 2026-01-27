'use client';

import { ExternalLink, Users, Gamepad2, FileText } from 'lucide-react';
import Link from 'next/link';
import { TimelineItemData, BOJ_TIER_NAMES, BOJ_TIER_COLORS } from '../mocks/dashboardMocks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Editor from '@monaco-editor/react';

interface TimelineItemProps {
  data: TimelineItemData;
}

const TimelineItem = ({ data }: TimelineItemProps) => {
  const { problemId, title, tier, tierLevel, link, sourceType, gameType, code } = data;

  // 언어 감지 (간단히)
  const language = code?.includes('#include') ? 'cpp' : 'python';

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-4">
        {/* 문제 번호 */}
        <span className="text-sm text-muted-foreground w-16">{problemId}</span>

        {/* 제목 */}
        <span className="font-medium text-foreground">{title}</span>

        {/* 티어 태그 (백준) */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium border text-muted-foreground"
          style={{ borderColor: BOJ_TIER_COLORS[tier] }}
        >
          {BOJ_TIER_NAMES[tier]} {tierLevel}
        </span>

        {/* 바로가기 링크 */}
        <Link
          href={link}
          target="_blank"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>

        {/* 코드 보기 (노트 아이콘) */}
        {code && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <FileText className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {problemId} {title} - 제출 코드
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 rounded-lg overflow-hidden border border-border">
                <Editor
                  height="500px"
                  defaultLanguage={language}
                  theme="vs-light"
                  value={code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    fontFamily: "'D2Coding', 'Fira Code', monospace",
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 출처 태그 목록 */}
      <div className="flex items-center gap-1.5 overflow-hidden">
        {data.sources.map((sourceName, idx) => {
          // 게임일 경우 접두사 추가
          const displayName =
            sourceType === 'game' && gameType
              ? `${gameType === 'team' ? '[팀]' : '[개인]'} ${sourceName}`
              : sourceName;

          return (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-primary text-xs font-medium max-w-[160px] shrink-0 border border-border"
              title={displayName}
            >
              {sourceType === 'study' ? (
                <Users className="w-3.5 h-3.5 shrink-0 text-primary" />
              ) : (
                <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-primary" />
              )}
              <span className="truncate">{displayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineItem;
