'use client';

import { useMemo, useState } from 'react';
import { X, Search, CheckCircle2, User, Clock, HardDrive, FileCode2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Submission } from '@/domains/study/types';

interface CCSubmissionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemTitle: string;
  problemExternalId?: string;
  submissions: Submission[];
  onViewCode: (submissionId: number) => void;
}

interface SubmissionGroup {
  key: string;
  nickname: string;
  submissions: Submission[];
}

export function CCSubmissionViewerModal({
  isOpen,
  onClose,
  problemTitle,
  problemExternalId,
  submissions,
  onViewCode,
}: CCSubmissionViewerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredSubmissions = (submissions || []).filter((sub) => {
    const nameToCheck = sub.nickname || '';
    return nameToCheck.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedSubmissions = useMemo<SubmissionGroup[]>(() => {
    const groups = new Map<string, SubmissionGroup>();

    filteredSubmissions.forEach((submission) => {
      const nickname = submission.nickname || 'Unknown';
      const key =
        typeof submission.userId === 'number'
          ? `user-${submission.userId}`
          : `nickname-${nickname.toLowerCase()}`;

      const existing = groups.get(key);
      if (existing) {
        existing.submissions.push(submission);
        return;
      }

      groups.set(key, {
        key,
        nickname,
        submissions: [submission],
      });
    });

    return Array.from(groups.values());
  }, [filteredSubmissions]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 pb-2">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Box className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">풀이 보관함</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {problemExternalId ? `${problemExternalId}. ` : ''}
                {problemTitle} - 제출 목록
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

        <div className="p-6 pt-2 flex flex-col gap-6 flex-1 overflow-hidden">
          <div className="hidden md:block bg-muted/40 dark:bg-slate-900/60 rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium">
                이 문제에 대해 제출된 저장 코드 목록입니다. (실시간 작성 코드 아님)
              </p>
            </div>
            <div className="pl-7 space-y-2">
              <p className="text-sm font-bold text-foreground">
                유저별로 묶어서 제출 히스토리를 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="유저명으로 검색해보세요..."
              className="flex h-11 w-full rounded-full border border-border bg-background px-4 pl-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
            성공 제출 수 {filteredSubmissions.length} · 유저 수 {groupedSubmissions.length}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
            {groupedSubmissions.length > 0 ? (
              groupedSubmissions.map((group) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-border bg-background/80 dark:bg-slate-900/60 shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 rounded-t-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{group.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.submissions.length} submissions
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50">
                    {group.submissions.map((sub) => (
                      <div
                        key={sub.submissionId}
                        className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 group"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-100 shrink-0" />
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0">
                              {sub.language || '-'}
                            </span>
                            {sub.submittedAt && (
                              <span className="text-xs text-muted-foreground shrink-0">{sub.submittedAt}</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
                              <HardDrive className="h-3 w-3" />
                              <span>{sub.memory ? (sub.memory / 1024).toFixed(1) : '0.0'}MB</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
                              <Clock className="h-3 w-3" />
                              <span>{sub.executionTime || 0}ms</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          className="h-8 w-8 p-0 sm:w-auto sm:px-3 rounded-full border border-primary bg-white dark:bg-slate-900/60 text-primary hover:bg-primary/10 hover:border-primary/20 shadow-sm transition-all text-xs font-medium group-hover:bg-primary group-hover:text-white group-hover:border-primary disabled:opacity-50 dark:group-hover:bg-primary shrink-0 ml-2"
                          disabled={!sub.submissionId}
                          onClick={() => sub.submissionId && onViewCode(sub.submissionId)}
                          title="코드 확인하기"
                        >
                          <FileCode2 className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">코드 확인</span>
                        </Button>
                      </div>
                    ))}
                  </div>
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

        <div className="p-6 pt-2 flex justify-end">
          <Button
            className="rounded-full px-6 bg-slate-800 hover:bg-slate-900 text-white font-medium dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={onClose}
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
