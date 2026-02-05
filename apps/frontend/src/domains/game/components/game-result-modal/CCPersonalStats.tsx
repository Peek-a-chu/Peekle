'use client';

import React, { useState, useEffect } from 'react';
import { Target, Clock, Trophy } from 'lucide-react';
import type { PersonalStats } from '../../types/result';

interface CCPersonalStatsProps {
  stats: PersonalStats;
  playTime: number;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  isOpen: boolean;
}

export function CCPersonalStats({ stats, playTime, mode, isOpen }: CCPersonalStatsProps) {
  const { correctAnswers, totalQuestions } = stats;

  const [isSlammed1, setIsSlammed1] = useState(false);
  const [isSlammed2, setIsSlammed2] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSlammed1(false);
      setIsSlammed2(false);
      // 슬램 연출(0.8s)이 끝나는 시점에 순차적으로 깜빡임 시작
      const t1 = setTimeout(() => setIsSlammed1(true), 1500); // 0.7s(딜레이) + 0.8s(슬램)
      const t2 = setTimeout(() => setIsSlammed2(true), 2000); // 1.2s(딜레이) + 0.8s(슬램)
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  const hours = Math.floor(playTime / 3600);
  const minutes = Math.floor((playTime % 3600) / 60);
  const seconds = playTime % 60;

  const isAllCorrect = correctAnswers === totalQuestions;

  return (
    <div className="grid grid-cols-2 gap-4 w-full px-2 mt-0">
      {/* 맞춘/푼 문제 (슬램 후 깜빡임) */}
      <div
        className={`relative flex flex-col items-center justify-center p-2.5 bg-transparent rounded-lg border-[6px] border-double border-green-500 select-none ${isSlammed1 ? 'animate-pulse' : 'animate-slam-effect opacity-0'
          }`}
        style={{ animationDelay: isSlammed1 ? '0s' : '0.7s' }}
      >
        <div className="flex items-center gap-2 text-green-500 mb-1">
          <Target className="w-5 h-5" />
          <span className="text-[14px] font-black uppercase tracking-widest">
            {mode === 'TIME_ATTACK' ? '푼 문제' : '맞춘 문제'}
          </span>
        </div>

        {/* 스피드 레이스 모드에서만 만점 시 ALL COMPLETED 표시 */}
        {mode === 'SPEED_RACE' && isAllCorrect ? (
          <div className="text-lg font-black text-green-500 tracking-wider py-1 uppercase">
            All Completed
          </div>
        ) : (
          <div className="text-4xl font-black text-green-500 tracking-tighter">
            {correctAnswers}
            {mode !== 'TIME_ATTACK' && (
              <span className="text-xl text-green-500/70 font-bold">/{totalQuestions}</span>
            )}
          </div>
        )}
      </div>

      {/* 플레이 타임 (슬램 후 깜빡임) */}
      <div
        className={`relative flex flex-col items-center justify-center p-2.5 bg-transparent rounded-lg border-[6px] border-double border-purple-500 select-none ${isSlammed2 ? 'animate-pulse' : 'animate-slam-effect opacity-0'
          }`}
        style={{ animationDelay: isSlammed2 ? '0s' : '1.2s' }}
      >
        <div className="flex items-center gap-2 text-purple-500 mb-1">
          <Clock className="w-5 h-5" />
          <span className="text-[14px] font-black uppercase tracking-widest">걸린 시간</span>
        </div>
        <div className="text-3xl font-black text-purple-500 tracking-tighter flex items-baseline justify-center">
          {hours > 0 && (
            <>
              {hours}
              <span className="text-lg font-bold ml-0.5 mr-2 opacity-70">h</span>
            </>
          )}
          {minutes}
          <span className="text-lg font-bold ml-0.5 mr-2 opacity-70">m</span>
          {seconds}
          <span className="text-lg font-bold ml-0.5 opacity-70">s</span>
        </div>
      </div>
    </div>
  );
}
