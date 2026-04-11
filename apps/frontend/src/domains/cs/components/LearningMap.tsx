'use client';

import React from 'react';
import { useEffect, useRef } from 'react';
import { CSProgress } from '@/domains/cs/api/csApi';
import { cn } from '@/lib/utils';
import { Check, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';

interface LearningMapProps {
  progress: CSProgress;
}

const STAGE_COUNT = 10;
const STAGE_WIDTH = 96; // w-24 (96px)
const STAGE_HEIGHT = 80; // h-20 (80px)
const GAP_Y = 48; // 48px

const getOffset = (i: number) => {
  const pattern = [-64, 0, 64, 0];
  return pattern[i % 4];
};

const getConnectorStyle = (i: number): React.CSSProperties => {
  const currentX = getOffset(i);
  const nextX = getOffset(i + 1);
  const dx = nextX - currentX;
  const dy = STAGE_HEIGHT + GAP_Y;

  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `${length}px`,
    height: '14px',
    transformOrigin: '0 50%',
    transform: `rotate(${angle}deg)`,
    zIndex: -1,
  };
};

export default function LearningMap({ progress }: LearningMapProps) {
  const { currentTrackNo, currentStageNo } = progress;
  const stageButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const targetIndex = currentStageNo - 1;
    if (targetIndex < 0 || targetIndex >= STAGE_COUNT) return;

    const target = stageButtonRefs.current[targetIndex];
    if (!target) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  }, [currentStageNo]);

  const handleStageClick = (stageNo: number, state: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED') => {
    // [DEBUG] 사용자 요청사항: 중간 과정 출력용 디버깅 로직 포함
    console.log(`[DEBUG] LearningMap Stage Clicked: Track ${currentTrackNo}, Stage ${stageNo}, State: ${state}`);
    
    if (state === 'LOCKED') {
      toast.info('이전 단계를 먼저 클리어해주세요 🔒');
      return;
    }

    // TODO: MVP 단계에서는 문제 세트 진입 화면이 없으므로 토스트 알림으로 임시 처리
    toast.success(`${currentTrackNo}-${stageNo} 스테이지 진입! (준비중)`);
  };

  return (
    <div className="relative w-full py-10 flex flex-col items-center">
      {/* 
        지그재그 배치를 위한 Flex Column 컨테이너
      */}
      <div 
        className="flex flex-col relative w-full max-w-sm items-center"
        style={{ gap: `${GAP_Y}px` }}
      >
        {Array.from({ length: STAGE_COUNT }).map((_, i) => {
          const stageNo = i + 1;
          let state: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' = 'LOCKED';
          if (stageNo < currentStageNo) state = 'COMPLETED';
          else if (stageNo === currentStageNo) state = 'IN_PROGRESS';

          const offsetX = getOffset(i);
          const isNotLast = i < STAGE_COUNT - 1;

          // 다음 스테이지로 이어지는 커넥터의 스타일 판별
          let bridgeClass = 'bg-surface-3 opacity-60';
          if (state === 'COMPLETED' || state === 'IN_PROGRESS') {
            const nextState = stageNo + 1 <= currentStageNo ? 'COMPLETED' : 
                               (stageNo + 1 === currentStageNo ? 'IN_PROGRESS' : 'LOCKED');
            if (nextState === 'COMPLETED' || nextState === 'IN_PROGRESS') {
              bridgeClass = 'bg-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.4)]';
            }
          }

          return (
            <div
              key={stageNo}
              className="relative flex items-center justify-center shrink-0"
              style={{
                width: STAGE_WIDTH,
                height: STAGE_HEIGHT,
                transform: `translateX(${offsetX}px)`,
              }}
            >
              {/* 커넥터 라인 */}
              {isNotLast && (
                <div
                  className={cn(
                    'rounded-full transition-colors duration-500',
                    bridgeClass
                  )}
                  style={getConnectorStyle(i)}
                />
              )}

              {/* 본체 버튼 (사각형) */}
              <button
                ref={(element) => {
                  stageButtonRefs.current[i] = element;
                }}
                onClick={() => handleStageClick(stageNo, state)}
                className={cn(
                  'relative z-10 w-full h-full rounded-2xl flex flex-col items-center justify-center transition-all duration-200 font-bold border-[3px] select-none text-sm tracking-wider',
                  {
                    'bg-primary border-primary text-primary-foreground shadow-[0_5px_0_rgba(0,0,0,0.15)] hover:bg-primary/95 hover:brightness-110 active:shadow-none active:translate-y-[5px]': state === 'COMPLETED',
                    'bg-background border-primary text-primary shadow-[0_5px_0_hsl(var(--primary)/0.6)] active:shadow-none active:translate-y-[5px] animate-float': state === 'IN_PROGRESS',
                    'bg-surface-2 border-border text-muted-foreground shadow-[0_5px_0_hsl(var(--border))] active:shadow-none active:translate-y-[5px] opacity-80 cursor-not-allowed': state === 'LOCKED',
                  }
                )}
              >
                {state === 'COMPLETED' && <Check className="w-7 h-7 mb-1" strokeWidth={3} />}
                {state === 'IN_PROGRESS' && <Play className="w-6 h-6 mb-1 ml-1" strokeWidth={3} fill="currentColor" />}
                {state === 'LOCKED' && <Lock className="w-5 h-5 mb-1 opacity-50" strokeWidth={2.5} />}
                
                <span>
                  {currentTrackNo}-{stageNo}
                </span>

                {/* 진행 중인 단계 강조 글로우 효과 */}
                {state === 'IN_PROGRESS' && (
                  <div className="absolute inset-0 rounded-2xl ring-[6px] ring-primary/20 blur-sm -z-10" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
