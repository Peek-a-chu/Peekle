'use client';

import { useState } from 'react';
import { X, Search, CheckCircle2, User, Clock, HardDrive, FileCode2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Submission } from '@/domains/study/types';

interface CCSubmissionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemTitle: string;
  problemNumber?: number;
  submissions: Submission[];
  onViewCode: (submissionId: number) => void;
}

export function CCSubmissionViewerModal({
  isOpen,
  onClose,
  problemTitle,
  problemNumber,
  submissions,
  onViewCode,
}: CCSubmissionViewerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredSubmissions = (submissions || []).filter((sub) => {
    // Check if nickname exists before filtering
    const nameToCheck = sub.nickname || '';
    return nameToCheck.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-2">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Box className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">풀이 보관함</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {problemNumber ? `${problemNumber}. ` : ''}
                {problemTitle} - 맞은 사람 목록
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Container */}
        <div className="p-6 pt-2 flex flex-col gap-6 flex-1 overflow-hidden">
          {/* Info Box */}
          <div className="bg-background rounded-xl border border-border p-5 shadow-sm space-y-4">
            {/* Top Info */}
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium">
                제출하여 맞은 사람에 한해서 저장된 코드를 보여줍니다. (실시간 작성 코드 X)
              </p>
            </div>

            {/* Guide Section */}
            <div className="pl-7 space-y-2">
              <p className="text-sm font-bold text-foreground">실시간 코드를 보고 싶다면?</p>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold text-[11px]">
                  방법 1
                </span>
                <span>상단 캠 영역의 참여자 타일을 선택하세요.</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold text-[11px]">
                  방법 2
                </span>
                <span className="leading-snug">
                  참여자 타일을 찾기 어렵다면, 참여자 목록에서 온라인 참가자 프로필 우측 클릭 메뉴의{' '}
                  <span className="font-semibold text-primary">&apos;실시간 코드 확인&apos;</span>{' '}
                  버튼을 클릭해주세요.
                </span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="유저명으로 검색하여 풀이를 찾으세요..."
              className="flex h-11 w-full rounded-full border border-border bg-background px-4 pl-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* List Header */}
          <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
            성공 제출 수 ({filteredSubmissions.length})
          </div>

          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((sub) => (
                <div
                  key={sub.submissionId}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar Placeholder */}
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      {/* Can use nice avatar images if available, using icon for now */}
                      <User className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground">
                          {sub.nickname || 'Unknown'}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-100" />
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          {sub.language}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">
                          <HardDrive className="h-3 w-3" />
                          <span>{sub.memory ? (sub.memory / 1024).toFixed(1) : '0.0'}MB</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>{sub.executionTime || 0}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="h-9 px-4 rounded-full border border-primary bg-white text-primary hover:bg-primary/10 hover:border-primary/20 shadow-sm transition-all text-sm font-medium group-hover:bg-primary group-hover:text-white group-hover:border-primary disabled:opacity-50"
                    disabled={!sub.submissionId}
                    onClick={() => sub.submissionId && onViewCode(sub.submissionId)}
                  >
                    <FileCode2 className="h-4 w-4 mr-1.5" />
                    코드 확인하기
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Search className="h-8 w-8 opacity-20" />
                <p className="text-sm">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex justify-end">
          <Button
            className="rounded-full px-6 bg-slate-800 hover:bg-slate-900 text-white font-medium"
            onClick={onClose}
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
