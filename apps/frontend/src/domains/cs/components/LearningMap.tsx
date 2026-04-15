'use client';

import React from 'react';
import { useEffect, useRef } from 'react';
import { CSProgress, CSStageStatusItem } from '@/domains/cs/api/csApi';
import { cn } from '@/lib/utils';
import { Check, FastForward, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LearningMapProps {
  progress: CSProgress;
  stages: CSStageStatusItem[];
  onRequestSkipTrack?: (targetTrackNo: number, targetTrackName?: string) => void;
}

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

export default function LearningMap({ progress, stages, onRequestSkipTrack }: LearningMapProps) {
  const router = useRouter();
  const { currentTrackNo, currentStageNo } = progress;
  const stageButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stageCount = stages.length;

  useEffect(() => {
    const targetIndex = stages.findIndex(
      (stage) => (stage.trackNo ?? currentTrackNo) === currentTrackNo && stage.stageNo === currentStageNo,
    );
    if (targetIndex < 0 || targetIndex >= stageCount) return;

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
  }, [currentStageNo, stageCount, stages]);

  const handleStageClick = (stage: CSStageStatusItem) => {
    // [DEBUG] 사용자 요청사항: 중간 과정 출력용 디버깅 로직 포함
    console.log(
      `[DEBUG] LearningMap Stage Clicked: Track ${currentTrackNo}, StageNo ${stage.stageNo}, StageId ${stage.stageId}, State: ${stage.status}`,
    );
    
    const targetTrackNo = stage.trackNo ?? currentTrackNo;
    const isNextTrackPreviewStage = targetTrackNo === currentTrackNo + 1 && stage.stageNo === 1;

    if (isNextTrackPreviewStage) {
      if (onRequestSkipTrack) {
        onRequestSkipTrack(targetTrackNo, stage.trackName);
      } else {
        toast.info('트랙 스킵 기능을 사용할 수 없습니다.');
      }
      return;
    }

    if (stage.status === 'LOCKED') {
      toast.info(stage.lockReason || '이전 단계를 먼저 클리어해주세요 🔒');
      return;
    }

    const query = new URLSearchParams({
      trackName: stage.trackName ?? progress.currentTrackName,
      trackNo: String(stage.trackNo ?? currentTrackNo),
      stageNo: String(stage.stageNo),
    });
    router.push(`/cs/stage/${stage.stageId}?${query.toString()}`);
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
        {stages.map((stage, i) => {
          const stageNo = stage.stageNo;
          const currentStageTrackNo = stage.trackNo ?? currentTrackNo;
          const isNextTrackPreviewStage = currentStageTrackNo === currentTrackNo + 1 && stageNo === 1;
          const prevStageTrackNo = i > 0 ? (stages[i - 1].trackNo ?? currentTrackNo) : currentStageTrackNo;
          const isTrackStart = i === 0 || currentStageTrackNo !== prevStageTrackNo;

          const state = stage.status;
          const offsetX = getOffset(i);
          const isNotLast = i < stageCount - 1;

          // 다음 스테이지로 이어지는 커넥터의 스타일 판별
          let bridgeClass = 'bg-surface-3 opacity-60';
          if (state === 'COMPLETED' || state === 'IN_PROGRESS') {
            const nextState = stages[i + 1]?.status;
            if (nextState === 'COMPLETED' || nextState === 'IN_PROGRESS') {
              bridgeClass = 'bg-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.4)]';
            }
          }

          return (
            <div
              key={stage.stageId}
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

              {/* 트랙 구분 라벨 및 선 */}
              {isTrackStart && (
                <div 
                  className="absolute flex items-center justify-center pointer-events-none"
                  style={{ 
                    top: -GAP_Y / 2, 
                    left: `calc(50% - ${offsetX}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 'min(100vw, 400px)',
                    zIndex: 0
                  }}
                >
                   <div className="flex-1 h-px bg-border border-t border-dashed border-border/80" />
                   <div className="px-4 py-1.5 bg-background rounded-full border-2 border-primary/20 text-[11px] font-bold text-primary shadow-sm tracking-wide shrink-0 mx-3 backdrop-blur-sm">
                     TRACK {currentStageTrackNo} {stage.trackName ? `· ${stage.trackName}` : ''}
                   </div>
                   <div className="flex-1 h-px bg-border border-t border-dashed border-border/80" />
                </div>
              )}

              {/* 본체 버튼 (사각형) */}
              <button
                ref={(element) => {
                  stageButtonRefs.current[i] = element;
                }}
                onClick={() => handleStageClick(stage)}


                className={cn(
                  'relative z-10 w-full h-full rounded-2xl flex flex-col items-center justify-center transition-all duration-200 font-bold border-[3px] select-none text-sm tracking-wider',
                  {
                    'bg-amber-50 border-amber-300 text-amber-700 shadow-[0_5px_0_hsl(35_90%_70%)] hover:bg-amber-100 active:shadow-none active:translate-y-[5px]': isNextTrackPreviewStage,
                    'bg-primary border-primary text-primary-foreground shadow-[0_5px_0_rgba(0,0,0,0.15)] hover:bg-primary/95 hover:brightness-110 active:shadow-none active:translate-y-[5px]': !isNextTrackPreviewStage && state === 'COMPLETED',
                    'bg-background border-primary text-primary shadow-[0_5px_0_hsl(var(--primary)/0.6)] active:shadow-none active:translate-y-[5px] animate-float': !isNextTrackPreviewStage && state === 'IN_PROGRESS',
                    'bg-surface-2 border-border text-muted-foreground shadow-[0_5px_0_hsl(var(--border))] active:shadow-none active:translate-y-[5px] opacity-80 cursor-not-allowed': !isNextTrackPreviewStage && state === 'LOCKED',
                  }
                )}
              >
                {isNextTrackPreviewStage && <FastForward className="w-5 h-5 mb-1" strokeWidth={2.5} />}
                {state === 'COMPLETED' && <Check className="w-7 h-7 mb-1" strokeWidth={3} />}
                {state === 'IN_PROGRESS' && <Play className="w-6 h-6 mb-1 ml-1" strokeWidth={3} fill="currentColor" />}
                {!isNextTrackPreviewStage && state === 'LOCKED' && <Lock className="w-5 h-5 mb-1 opacity-50" strokeWidth={2.5} />}
                
                <span>
                  {stage.trackNo ?? currentTrackNo}-{stageNo}
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
