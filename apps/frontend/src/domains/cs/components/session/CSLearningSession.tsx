'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  startCSStageAttempt,
  answerCSStageQuestion,
  completeCSStageAttempt,
  submitCSQuestionClaim,
  fetchCSBootstrap,
  CSQuestionPayload,
  CSAttemptAnswerRequest,
  CSAttemptAnswerResponse,
  CSQuestionClaimType,
} from '@/domains/cs/api/csApi';

import CSQuestionPresenter from './CSQuestionPresenter';
import { getCSStageResultStorageKey } from '@/domains/cs/utils/stageResultStorage';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CSLearningSessionProps {
  stageId: number;
}

type Phase = 'loading' | 'playing' | 'submitting_complete' | 'error';

interface WrongFeedbackContent {
  answer: string | null;
  explanation: string | null;
}

interface AnswerDisplay {
  number: string | null;
  text: string;
}

function parseWrongFeedback(answerResult: CSAttemptAnswerResponse): WrongFeedbackContent {
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

export default function CSLearningSession({ stageId }: CSLearningSessionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedbackAdvanceLockRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<CSQuestionPayload | null>(null);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [solvedQuestionIds, setSolvedQuestionIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [answerResult, setAnswerResult] = useState<CSAttemptAnswerResponse | null>(null);
  const [trackInfo, setTrackInfo] = useState<{ name: string; trackNo: number; stageNo: number } | null>(null);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<CSAttemptAnswerRequest | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimType, setClaimType] = useState<CSQuestionClaimType>('INCORRECT_ANSWER');
  const [claimDescription, setClaimDescription] = useState('');
  const [isClaimSubmitting, setIsClaimSubmitting] = useState(false);

  const initSession = useCallback(async () => {
    try {
      setPhase('loading');
      let hasTrackInfoFromBootstrap = false;

      try {
        const bootstrap = await fetchCSBootstrap();
        if (bootstrap && bootstrap.progress && bootstrap.stages) {
          const matchedStage = bootstrap.stages.find((s) => s.stageId === stageId);
          if (matchedStage) {
            setTrackInfo({
              name: bootstrap.progress.currentTrackName,
              trackNo: bootstrap.progress.currentTrackNo,
              stageNo: matchedStage.stageNo
            });
            hasTrackInfoFromBootstrap = true;
          }
        }
      } catch (err) {
        console.error('Failed to fetch track info:', err);
      }

      const source = searchParams.get('source');
      if (!hasTrackInfoFromBootstrap && source === 'past-exam') {
        const year = searchParams.get('year');
        const round = searchParams.get('round');
        if (year && round) {
          setTrackInfo({
            name: `${year}년 정보처리기사 기출`,
            trackNo: Number(year),
            stageNo: Number(round),
          });
        }
      }

      const res = await startCSStageAttempt(stageId);
      setCurrentQuestion(res.firstQuestion);
      setTotalQuestionCount(res.totalQuestionCount);
      setSolvedQuestionIds([]);
      setLastSubmittedAnswer(null);
      setPhase('playing');
    } catch (err) {
      console.error('Failed to start session:', err);
      toast.error('스테이지 세션을 시작하지 못했습니다.');
      setPhase('error');
    }
  }, [searchParams, stageId]);

  useEffect(() => {
    initSession();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initSession]);

  const handleCompleteSession = async () => {
    try {
      setPhase('submitting_complete');
      const res = await completeCSStageAttempt(stageId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(getCSStageResultStorageKey(stageId), JSON.stringify(res));
      }
      router.replace(`/cs/stage/${stageId}/result`);
    } catch (err) {
      console.error(err);
      toast.error('스테이지 결과를 불러오는 데 실패했습니다.');
      setPhase('error');
    }
  };

  const handleAnswerSubmit = async (payload: CSAttemptAnswerRequest) => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setLastSubmittedAnswer(payload);
    try {
      console.log(`[DEBUG] Submitting answer for question ${currentQuestion.questionId}...`);
      const res = await answerCSStageQuestion(stageId, payload);
      
      // 피드백 모달이 떠 있는 동안엔 진행도를 바꾸지 않고 대기
      setAnswerResult(res);
    } catch (err) {
      console.error(err);
      toast.error('답안 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetClaimForm = () => {
    setClaimType('INCORRECT_ANSWER');
    setClaimDescription('');
  };

  const handleSubmitClaim = async () => {
    if (!answerResult) return;
    const normalizedDescription = claimDescription.trim();
    if (normalizedDescription.length < 10) {
      toast.error('신고 내용은 최소 10자 이상 입력해주세요.');
      return;
    }

    try {
      setIsClaimSubmitting(true);
      await submitCSQuestionClaim(stageId, {
        questionId: answerResult.questionId,
        claimType,
        description: normalizedDescription,
        isCorrect: answerResult.isCorrect,
        selectedChoiceNo: lastSubmittedAnswer?.selectedChoiceNo,
        submittedAnswer: lastSubmittedAnswer?.answerText,
      });
      toast.success('문제 신고가 접수되었습니다.');
      setClaimDialogOpen(false);
      resetClaimForm();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : '문제 신고 접수에 실패했습니다.');
    } finally {
      setIsClaimSubmitting(false);
    }
  };

  const handleNextAfterFeedback = async () => {
    if (!answerResult || feedbackAdvanceLockRef.current) return;
    feedbackAdvanceLockRef.current = true;
    const { isLast, nextQuestion, isCorrect, questionId } = answerResult;
    
    // 계속하기 버튼을 누른 후 상태 업데이트
    if (isCorrect) {
      setSolvedQuestionIds((previous) =>
        previous.includes(questionId) ? previous : [...previous, questionId],
      );
    }
    
    setAnswerResult(null);
    setClaimDialogOpen(false);
    resetClaimForm();
    setLastSubmittedAnswer(null);

    if (isLast) {
      await handleCompleteSession();
    } else if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    }
  };

  useEffect(() => {
    if (!answerResult) {
      feedbackAdvanceLockRef.current = false;
      return;
    }

    const handleFeedbackAdvanceKeyDown = (event: KeyboardEvent) => {
      if (claimDialogOpen) return;
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      void handleNextAfterFeedback();
    };

    window.addEventListener('keydown', handleFeedbackAdvanceKeyDown);
    return () => {
      window.removeEventListener('keydown', handleFeedbackAdvanceKeyDown);
    };
  }, [answerResult, claimDialogOpen, handleNextAfterFeedback]);

  const handleExitConfirm = () => {
    router.replace('/cs');
  };

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
        <Button onClick={() => router.replace('/cs')} variant="outline">
          돌아가기
        </Button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">스테이지를 준비하고 있습니다...</p>
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

  return (
    <div className="flex flex-col w-full animate-in fade-in relative min-h-[80vh] pb-28">
      <header className="flex flex-col py-4 px-6 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50 gap-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground">
              {trackInfo 
                ? `${trackInfo.name} (${trackInfo.trackNo}-${trackInfo.stageNo})` 
                : `(트랙 정보 없음) - 스테이지 ${stageId}`}
            </span>
            {phase === 'playing' && totalQuestionCount > 0 && (
              <h1 className="text-lg font-bold mt-0.5">
                진행도: {solvedQuestionIds.length} / {totalQuestionCount}
              </h1>
            )}
          </div>
          <button
            onClick={() => setShowExitAlert(true)}
            className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors group"
          >
            <X className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
        {phase === 'playing' && totalQuestionCount > 0 && (
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${(solvedQuestionIds.length / totalQuestionCount) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4">
        {phase === 'playing' && currentQuestion && (
          <CSQuestionPresenter
            key={currentQuestion.questionId}
            question={currentQuestion}
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
            isInteractionLocked={Boolean(answerResult)}
          />
        )}
      </main>

      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              학습을 중단하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              지금 나가시면 현재까지의 풀이 진행 상황이 모두 사라집니다.
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

      {/* 피드백 모달 */}
      {answerResult && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in bg-black/40 items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          {(() => {
            const wrongFeedback = !answerResult.isCorrect ? parseWrongFeedback(answerResult) : null;
            const answerDisplay = wrongFeedback?.answer ? splitAnswerText(wrongFeedback.answer) : null;
            return (
          <div
            className={`w-full sm:max-w-lg p-6 sm:p-8 flex flex-col gap-4 shadow-2xl rounded-t-3xl sm:rounded-2xl ${
              answerResult.isCorrect
                ? 'bg-emerald-50'
                : 'bg-gradient-to-b from-rose-50 to-red-50'
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
                answerResult.isCorrect
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              계속하기
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 font-semibold rounded-xl"
              onClick={() => setClaimDialogOpen(true)}
            >
              문제 신고
            </Button>
          </div>
            );
          })()}
        </div>
      )}

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>문제 신고</DialogTitle>
            <DialogDescription>
              정답/해설/문항 오류를 알려주시면 검토 후 반영하겠습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="claim-type">신고 유형</Label>
              <Select value={claimType} onValueChange={(value) => setClaimType(value as CSQuestionClaimType)}>
                <SelectTrigger id="claim-type">
                  <SelectValue placeholder="신고 유형을 선택해주세요." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCORRECT_ANSWER">정답이 잘못됨</SelectItem>
                  <SelectItem value="INCORRECT_EXPLANATION">해설이 잘못됨</SelectItem>
                  <SelectItem value="QUESTION_TEXT_ERROR">문제 문구가 모호/오류</SelectItem>
                  <SelectItem value="OTHER">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="claim-description">상세 내용</Label>
              <Textarea
                id="claim-description"
                value={claimDescription}
                onChange={(event) => setClaimDescription(event.target.value)}
                placeholder="어떤 부분이 문제인지 구체적으로 적어주세요. (최소 10자)"
                minLength={10}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{claimDescription.trim().length}/2000</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClaimDialogOpen(false)}
              disabled={isClaimSubmitting}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmitClaim}
              disabled={isClaimSubmitting || claimDescription.trim().length < 10}
            >
              {isClaimSubmitting ? '제출 중...' : '신고 제출'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
