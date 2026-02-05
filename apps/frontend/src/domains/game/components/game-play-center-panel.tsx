'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { CCIDEPanel, CCIDEPanelRef } from '@/domains/study/components/CCIDEPanel';
import { GameVideoGrid } from '@/domains/game/components/game-video-grid';
import { GameIDEToolbar } from '@/domains/game/components/game-ide-toolbar';
import { GamePlayParticipant } from '@/domains/game/types/game-types';

interface GamePlayCenterPanelProps {
  code: string;
  language: string;
  participants: GamePlayParticipant[];
  currentUserId: number;
  selectedProblemUrl?: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmit: () => void;
  className?: string;
  micState?: Record<string, boolean>;
  camState?: Record<string, boolean>;
}

export function GamePlayCenterPanel({
  code,
  language,
  participants,
  currentUserId,
  selectedProblemUrl,
  onCodeChange,
  onLanguageChange,
  onSubmit,
  className,
  micState,
  camState,
}: GamePlayCenterPanelProps) {
  const [isVideoGridFolded, setIsVideoGridFolded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'vs-dark'>('light');
  const idePanelRef = useRef<CCIDEPanelRef>(null);

  const toggleVideoGrid = () => {
    setIsVideoGridFolded((prev) => !prev);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'vs-dark' : 'light'));
  };

  const handleCopy = () => {
    void idePanelRef.current?.handleCopy();
  };

  const handleSubmit = () => {
    // 코드 복사 먼저 수행 (사용자 편의)
    void idePanelRef.current?.handleCopy();

    onSubmit();

    // 백준 제출 페이지로 이동 (/problem/ -> /submit/)
    if (selectedProblemUrl) {
      let submitUrl = selectedProblemUrl;
      if (submitUrl.includes('/problem/')) {
        submitUrl = submitUrl.replace('/problem/', '/submit/');
      }
      window.open(submitUrl, '_blank');
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* 화상 타일 헤더 */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 h-14 shrink-0">
        <span className="text-sm font-medium">화상 타일</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleVideoGrid}
          title={isVideoGridFolded ? '화상 타일 펼치기' : '화상 타일 접기'}
        >
          {isVideoGridFolded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 화상 타일 (게임용) */}
      {!isVideoGridFolded && (
        <GameVideoGrid
          participants={participants}
          currentUserId={currentUserId}
          micState={micState}
          camState={camState}
        />
      )}

      {/* IDE 영역 */}
      <div
        className="relative flex flex-1 flex-col min-w-0 bg-background"
        style={{ minHeight: '400px' }}
      >
        {/* IDE 툴바 */}
        <div className="flex h-14 shrink-0 border-b border-border bg-card">
          <div className="w-full">
            <GameIDEToolbar
              language={language}
              theme={theme}
              onLanguageChange={onLanguageChange}
              onThemeToggle={toggleTheme}
              onCopy={handleCopy}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* 에디터 */}
        <div className="flex-1 w-full" style={{ minHeight: '300px' }}>
          <CCIDEPanel
            key={`${selectedProblemUrl}-${language}`} // 문제 또는 언어가 바뀌면 IDE 리셋
            ref={idePanelRef}
            initialCode={code}
            language={language}
            theme={theme}
            hideToolbar
            onLanguageChange={onLanguageChange}
            onThemeChange={setTheme}
            onCodeChange={onCodeChange} // 코드 변경 시 상위 컴포넌트(problemCodes)에 저장
          />
        </div>
      </div>
    </div>
  );
}
