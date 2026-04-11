'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  startCSStageAttempt,
  answerCSStageQuestion,
  completeCSStageAttempt,
  CSQuestionPayload,
  CSAttemptCompleteResponse,
  CSAttemptAnswerRequest,
  CSAttemptAnswerResponse,
} from '@/domains/cs/api/csApi';

import CSMockProblem from './CSMockProblem';
import CSResultScreen from './CSResultScreen';
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

interface CSLearningSessionProps {
  stageId: number;
}

type Phase = 'loading' | 'playing' | 'submitting_complete' | 'result' | 'error';

export default function CSLearningSession({ stageId }: CSLearningSessionProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<CSQuestionPayload | null>(null);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [solvedQuestionIds, setSolvedQuestionIds] = useState<number[]>([]);
  const [resultData, setResultData] = useState<CSAttemptCompleteResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [answerResult, setAnswerResult] = useState<CSAttemptAnswerResponse | null>(null);

  const initSession = useCallback(async () => {
    try {
      setPhase('loading');
      const res = await startCSStageAttempt(stageId);
      setCurrentQuestion(res.firstQuestion);
      setTotalQuestionCount(res.totalQuestionCount);
      setSolvedQuestionIds([]);
      setPhase('playing');
    } catch (err) {
      console.error('Failed to start session:', err);
      toast.error('스테이지 세션을 시작하지 못했습니다.');
      setPhase('error');
    }
  }, [stageId]);

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
      setResultData(res);
      setPhase('result');
    } catch (err) {
      console.error(err);
      toast.error('스테이지 결과를 불러오는 데 실패했습니다.');
      setPhase('error');
    }
  };

  const handleAnswerSubmit = async (payload: CSAttemptAnswerRequest) => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
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

  const handleNextAfterFeedback = async () => {
    if (!answerResult) return;
    const { isLast, nextQuestion, isCorrect, questionId } = answerResult;
    
    // 계속하기 버튼을 누른 후 상태 업데이트
    if (isCorrect) {
      setSolvedQuestionIds((previous) =>
        previous.includes(questionId) ? previous : [...previous, questionId],
      );
    }
    
    setAnswerResult(null);

    if (isLast) {
      await handleCompleteSession();
    } else if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    }
  };

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

  if (phase === 'result' && resultData) {
    return <CSResultScreen result={resultData} />;
  }

  return (
    <div className="flex flex-col w-full animate-in fade-in relative min-h-[80vh] pb-10">
      <header className="flex items-center justify-between py-4 px-6 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-muted-foreground">스테이지 {stageId}</span>
          {phase === 'playing' && totalQuestionCount > 0 && (
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">
                진행도: {solvedQuestionIds.length} / {totalQuestionCount}
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
          <CSMockProblem
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
          <div
            className={`w-full sm:max-w-lg p-6 sm:p-8 flex flex-col gap-4 shadow-2xl rounded-t-3xl sm:rounded-2xl ${
              answerResult.isCorrect ? 'bg-green-50' : 'bg-red-50'
            } animate-in slide-in-from-bottom sm:slide-in-from-bottom-8 duration-300 pointer-events-auto`}
          >
            <div className="flex flex-col gap-2">
              <h2
                className={`text-2xl font-black tracking-tight ${
                  answerResult.isCorrect ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {answerResult.isCorrect ? '정답입니다!' : '틀렸습니다.'}
              </h2>
              {answerResult.feedback && (
                <div className="mt-2 p-4 rounded-xl bg-white/60 text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">
                  <span className="font-bold block mb-1 text-sm text-muted-foreground">설명</span>
                  {answerResult.feedback}
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
          </div>
        </div>
      )}
    </div>
  );
}
