'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  CSAttemptAnswerRequest,
  CSQuestionPayload,
  CSWrongReviewAnswerResponse,
  CSWrongReviewCompleteResponse,
  answerCSWrongReviewQuestion,
  completeCSWrongReview,
  startCSWrongReview,
} from '@/domains/cs/api/csApi';
import CSQuestionPresenter from './CSQuestionPresenter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface CSWrongReviewSessionProps {
  domainId: number | null;
}

type SessionPhase = 'loading' | 'playing' | 'submitting_complete' | 'empty' | 'error' | 'done';

interface WrongFeedbackContent {
  answer: string | null;
  explanation: string | null;
}

interface AnswerDisplay {
  number: string | null;
  text: string;
}

function parseWrongFeedback(answerResult: CSWrongReviewAnswerResponse): WrongFeedbackContent {
  const lines = (answerResult.feedback || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedAnswerLine = lines.find((line) => line.startsWith('정답:'));
  const explanationStartIndex = lines.findIndex((line) => line.startsWith('해설:'));

  const parsedAnswer = parsedAnswerLine?.replace(/^정답:\s*/, '').trim() || null;
  let parsedExplanation: string | null = null;

  if (explanationStartIndex >= 0) {
    const firstLine = lines[explanationStartIndex].replace(/^해설:\s*/, '').trim();
    const remainLines = lines.slice(explanationStartIndex + 1);
    const merged = [firstLine, ...remainLines].filter(Boolean).join('\n').trim();
    parsedExplanation = merged || null;
  }

  return {
    answer: answerResult.correctAnswer?.trim() || parsedAnswer,
    explanation: parsedExplanation,
  };
}

function splitAnswerText(answer: string): AnswerDisplay {
  const normalized = answer.trim();
  const matched = normalized.match(/^(\d+)\.\s*(.+)$/);

  if (!matched) {
    return { number: null, text: normalized };
  }

  return {
    number: matched[1],
    text: matched[2].trim(),
  };
}

export default function CSWrongReviewSession({ domainId }: CSWrongReviewSessionProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CSQuestionPayload | null>(null);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [progressedCount, setProgressedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [answerResult, setAnswerResult] = useState<CSWrongReviewAnswerResponse | null>(null);
  const [completeResult, setCompleteResult] = useState<CSWrongReviewCompleteResponse | null>(null);

  const initSession = useCallback(async () => {
    try {
      setPhase('loading');
      const started = await startCSWrongReview({
        domainId: domainId ?? undefined,
        questionCount: 10,
      });

      if (!started.reviewId || !started.firstQuestion || started.totalQuestionCount === 0) {
        setPhase('empty');
        return;
      }

      setReviewId(started.reviewId);
      setCurrentQuestion(started.firstQuestion);
      setTotalQuestionCount(started.totalQuestionCount);
      setProgressedCount(0);
      setPhase('playing');
    } catch (error) {
      console.error('Failed to start wrong review session:', error);
      toast.error('오답 복습 세션을 시작하지 못했습니다.');
      setPhase('error');
    }
  }, [domainId]);

  useEffect(() => {
    initSession();

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initSession]);

  const handleAnswerSubmit = async (payload: CSAttemptAnswerRequest) => {
    if (!reviewId || !currentQuestion) return;

    setIsSubmitting(true);
    try {
      const response = await answerCSWrongReviewQuestion(reviewId, payload);
      setAnswerResult(response);
    } catch (error) {
      console.error('Failed to submit wrong review answer:', error);
      toast.error('답안 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!reviewId) return;
    try {
      setPhase('submitting_complete');
      const result = await completeCSWrongReview(reviewId);
      setCompleteResult(result);
      setPhase('done');
    } catch (error) {
      console.error('Failed to complete wrong review:', error);
      toast.error('오답 복습 결과 조회에 실패했습니다.');
      setPhase('error');
    }
  };

  const handleNextAfterFeedback = async () => {
    if (!answerResult) return;

    const { isLast, nextQuestion, progress } = answerResult;
    setProgressedCount(progress.currentQuestionNo);
    setAnswerResult(null);

    if (isLast) {
      await handleComplete();
    } else if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    }
  };

  const handleExitConfirm = () => {
    router.replace('/cs/wrong-problems');
  };

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
        <Button onClick={() => router.replace('/cs/wrong-problems')} variant="outline">
          돌아가기
        </Button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">복습 세션을 준비하고 있습니다...</p>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground/50" />
        <h2 className="text-xl font-bold">복습할 오답이 없습니다</h2>
        <Button onClick={() => router.replace('/cs/wrong-problems')} variant="outline">
          오답노트로 이동
        </Button>
      </div>
    );
  }

  if (phase === 'submitting_complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">결과를 집계하고 있습니다...</p>
      </div>
    );
  }

  if (phase === 'done' && completeResult) {
    return (
      <div className="w-[calc(100%+2rem)] -mx-4 sm:w-full sm:mx-auto flex-1 flex flex-col items-center justify-center sm:max-w-lg py-0 sm:py-12 animate-in fade-in zoom-in px-0 sm:px-4 min-h-[100dvh] sm:min-h-[80vh]">
        <div className="isolate w-full min-h-[100dvh] sm:min-h-0 border-none shadow-none sm:shadow-xl bg-background/90 sm:bg-background/50 sm:backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-start sm:justify-center px-6 pt-[max(5.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-8 text-center rounded-none sm:rounded-3xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/25 to-transparent sm:inset-0 sm:h-auto sm:from-primary/10 z-0" />
          <div className="relative z-10 w-full flex flex-col items-center">
            <h1 className="text-3xl font-extrabold mb-2 text-foreground tracking-tight">복습 완료</h1>
            <p className="text-muted-foreground mb-8">
              정답률 <span className="font-bold text-primary">{completeResult.correctRate}%</span> (
              {completeResult.correctCount}/{completeResult.totalQuestionCount})
            </p>

            <div className="w-full bg-muted/60 border border-border rounded-2xl p-4 text-left mb-8">
              <p className="text-sm">
                복습 완료 처리: <span className="font-bold">{completeResult.clearedCount}개</span>
              </p>
              <p className="text-sm mt-1">
                아직 복습 필요: <span className="font-bold">{completeResult.remainedActiveCount}개</span>
              </p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <Button className="w-full h-14 text-lg font-bold rounded-2xl" onClick={() => router.replace('/cs/wrong-problems')}>
                오답노트로 돌아가기
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 text-lg font-bold rounded-2xl"
                onClick={() => router.replace(`/cs/wrong-problems/review?domainId=${domainId ?? ''}`)}
              >
                다시 복습하기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full animate-in fade-in relative min-h-[80vh] pb-28">
      <header className="flex items-center justify-between py-4 px-6 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-muted-foreground">오답 복습</span>
          {phase === 'playing' && totalQuestionCount > 0 && (
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">
                진행도: {progressedCount} / {totalQuestionCount}
              </h1>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowExitAlert(true)}
          className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors group"
        >
          <X className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4">
        {phase === 'playing' && currentQuestion && (
          <CSQuestionPresenter
            key={currentQuestion.questionId}
            question={currentQuestion}
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </main>

      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              복습을 중단하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              지금 나가시면 현재까지의 복습 진행 상황이 사라집니다.
              <br />
              다음에 다시 들어오면 처음부터 시작해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl">계속 풀기</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleExitConfirm}
            >
              나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {answerResult && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in bg-black/40 items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          {(() => {
            const wrongFeedback = !answerResult.isCorrect ? parseWrongFeedback(answerResult) : null;
            const answerDisplay = wrongFeedback?.answer ? splitAnswerText(wrongFeedback.answer) : null;
            return (
              <div
                className={`w-full sm:max-w-lg p-6 sm:p-8 flex flex-col gap-4 shadow-2xl rounded-t-3xl sm:rounded-2xl ${
                  answerResult.isCorrect ? 'bg-emerald-50' : 'bg-gradient-to-b from-rose-50 to-red-50'
                } animate-in slide-in-from-bottom sm:slide-in-from-bottom-8 duration-300 pointer-events-auto`}
              >
                <div className="flex flex-col gap-2">
                  <h2
                    className={`text-2xl font-black tracking-tight ${
                      answerResult.isCorrect ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {answerResult.isCorrect ? '정답입니다!' : '틀렸습니다.'}
                  </h2>
                  {!answerResult.isCorrect && (
                    <div className="mt-2 flex flex-col gap-3">
                      {wrongFeedback?.answer && (
                        <div className="rounded-xl border-l-4 border-l-red-500 bg-white px-4 pt-2 pb-5 shadow-sm">
                          <span className="inline-flex rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                            정답
                          </span>
                          {answerDisplay?.number ? (
                            <div className="mt-3 flex items-end gap-2">
                              <span className="text-4xl font-black leading-none text-red-600">
                                {answerDisplay.number}.
                              </span>
                              <span className="pb-0.5 text-2xl font-extrabold leading-tight text-red-600">
                                {answerDisplay.text}
                              </span>
                            </div>
                          ) : (
                            <p className="mt-3 text-2xl font-extrabold leading-tight text-red-600">
                              {wrongFeedback.answer}
                            </p>
                          )}
                        </div>
                      )}

                      {wrongFeedback?.explanation && (
                        <div className="rounded-xl border-l-4 border-l-slate-300 bg-slate-50/90 px-4 pt-2 pb-4 shadow-sm">
                          <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                            해설
                          </span>
                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                            {wrongFeedback.explanation}
                          </p>
                        </div>
                      )}

                      {!wrongFeedback?.answer && !wrongFeedback?.explanation && answerResult.feedback && (
                        <div className="rounded-xl border-l-4 border-l-slate-300 bg-slate-50/90 px-4 py-4 shadow-sm">
                          <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                            {answerResult.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleNextAfterFeedback}
                  className={`w-full h-14 mt-4 font-bold text-lg rounded-xl shadow-sm hover:shadow-md transition-all ${
                    answerResult.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                >
                  계속하기
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
