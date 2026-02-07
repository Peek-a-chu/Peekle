'use client';

import { useState, useEffect, useCallback } from 'react';

type TimerMode = 'countdown' | 'countup';

interface UseGameTimerOptions {
  initialTime: number; // 초 단위 (countdown: 시작 시간, countup: 0부터)
  mode?: TimerMode; // 타이머 모드
  onTimeUp?: () => void; // countdown 모드에서 시간 종료 시
  autoStart?: boolean;
}

interface UseGameTimerReturn {
  time: number;
  formattedTime: string;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
}

export function useGameTimer({
  initialTime,
  mode = 'countdown',
  onTimeUp,
  autoStart = true,
}: UseGameTimerOptions): UseGameTimerReturn {
  const startTime = initialTime;
  const [time, setTime] = useState(startTime);
  const [isRunning, setIsRunning] = useState(false);

  // 시간 포맷팅 (MM:SS)
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // autoStart가 true가 되면 타이머 시작
  useEffect(() => {
    if (autoStart && !isRunning) {
      if (mode === 'countdown' && time <= 0) return;
      setIsRunning(true);
    }
  }, [autoStart, isRunning, mode, time]);

  // initialTime이 변경되거나 mode가 변경되면 time 업데이트
  useEffect(() => {
    if (mode === 'countdown') {
      if (initialTime > 0) setTime(initialTime);
    } else {
      // countup 모드일 때는 0으로 초기화 (또는 initialTime 사용 가능)
      setTime(0);
    }
  }, [initialTime, mode]);

  // 타이머 시작
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // 타이머 일시정지
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // 타이머 리셋
  const reset = useCallback(
    (newTime?: number) => {
      setTime(newTime ?? startTime);
      setIsRunning(false);
    },
    [startTime],
  );

  // 타이머 로직
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime((prev) => {
        if (mode === 'countdown') {
          // 카운트다운
          if (prev <= 1) {
            setIsRunning(false);
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        } else {
          // 카운트업
          return prev + 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, onTimeUp]);

  return {
    time,
    formattedTime: formatTime(time),
    isRunning,
    start,
    pause,
    reset,
  };
}
