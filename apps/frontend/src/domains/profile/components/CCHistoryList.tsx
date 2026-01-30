'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SubmissionHistory } from '../types';

interface Props {
  initialHistory: SubmissionHistory[];
}

export function CCHistoryList({ initialHistory }: Props) {
  const [history] = useState(initialHistory);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionHistory | null>(null);
  const searchParams = useSearchParams();

  // URL query params 처리 (submissionId)
  useEffect(() => {
    const submissionId = searchParams.get('submissionId');
    if (submissionId) {
      const target = history.find(h => String(h.id) === submissionId);
      if (target) {
        setSelectedSubmission(target);
      }
    }
  }, [searchParams, history]);

  // Mock Filters
  const tiers = ['전체', 'Bronze', 'Silver', 'Gold', 'Platinum'];
  const sources = [
    { label: '전체', value: 'ALL' },
    { label: '스터디', value: 'STUDY' },
    { label: '게임', value: 'GAME' },
    { label: '혼자 풀기', value: 'SOLO' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">
      {/* 1. Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-muted rounded-full transition text-muted-foreground hover:text-foreground"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">풀이 내역 조회</h1>
          <p className="text-muted-foreground text-sm">내가 푼 문제들의 기록을 확인하세요</p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-muted-foreground">기간</label>
          <input
            type="date"
            className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background"
          />
        </div>

        <div className="flex flex-col gap-1.5 w-32">
          <label className="text-xs font-semibold text-muted-foreground">티어</label>
          <select className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background cursor-pointer">
            {tiers.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-32">
          <label className="text-xs font-semibold text-muted-foreground">풀이 장소</label>
          <select className="border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background cursor-pointer">
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button className="h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto">
          <span>🚿</span> 초기화
        </button>
      </div>

      {/* 3. List & Drawer Layout */}
      <div className="flex gap-6 relative">
        {/* List Section */}
        <div
          className={`flex-1 space-y-3 transition-all ${selectedSubmission ? 'w-2/3' : 'w-full'}`}
        >
          <p className="text-sm font-medium text-muted-foreground mb-2">
            총 {history.length}개의 기록
          </p>

          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedSubmission(item)}
              className={`bg-card border rounded-xl p-5 flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group
                        ${selectedSubmission?.id === item.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'}
                    `}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                            ${item.isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                >
                  {item.isSuccess ? '✓' : '✗'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-lg">
                      {item.problemId}. {item.problemTitle}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold text-white
                                    ${
                                      item.tier.includes('Bronze')
                                        ? 'bg-amber-700'
                                        : item.tier.includes('Silver')
                                          ? 'bg-slate-400'
                                          : 'bg-yellow-500' // Gold etc
                                    }`}
                    >
                      {item.tier}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.language}</span>
                    <span>•</span>
                    <span>{item.memory}</span>
                    <span>•</span>
                    <span>{item.time}</span>

                    {item.sourceType !== 'SOLO' && (
                      <span className="ml-1 px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">
                        {item.sourceType === 'STUDY' ? '스터디' : item.sourceDetail || '게임'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-6">{item.timestamp}</p>
                <span className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-primary transition-opacity">
                  상세보기 →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Code Drawer (Side Panel) */}
        {selectedSubmission && (
          <div className="w-[400px] bg-card border border-border rounded-xl shadow-xl fixed right-6 top-24 bottom-6 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-start justify-between bg-muted/30 rounded-t-xl">
              <div>
                <h2 className="font-bold text-lg text-foreground">
                  {selectedSubmission.problemId}. {selectedSubmission.problemTitle}
                </h2>
                <div className="flex gap-2 text-xs mt-1">
                  <span
                    className={`${selectedSubmission.isSuccess ? 'text-green-500' : 'text-red-500'} font-bold`}
                  >
                    {selectedSubmission.isSuccess ? '성공' : '실패'}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{selectedSubmission.timestamp}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                &times;
              </button>
            </div>

            {/* Code Area */}
            <div className="flex-1 overflow-auto p-0 bg-[#1e1e1e]">
              <pre className="p-4 text-sm font-mono text-gray-200 leading-relaxed">
                <code>
                  {selectedSubmission.code ||
                    '// 코드를 불러올 수 없습니다.\n// (확장프로그램 설정 확인 필요)'}
                </code>
              </pre>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/30 rounded-b-xl">
              <button
                onClick={() => {
                  /* Copy Logic */
                }}
                className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted text-foreground flex items-center gap-2"
              >
                📋 코드 복사
              </button>
              <a
                href={`https://www.acmicpc.net/problem/${selectedSubmission.problemId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                문제 보러가기 ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
