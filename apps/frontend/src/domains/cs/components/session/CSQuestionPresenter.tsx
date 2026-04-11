'use client';

import React, { useState, useEffect } from 'react';
import { CSQuestionPayload, CSAttemptAnswerRequest } from '@/domains/cs/api/csApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: '객관식',
  OX: 'OX 퀴즈',
  SHORT_ANSWER: '단답형',
  ESSAY: '서술형',
};

interface CSQuestionPresenterProps {
  question: CSQuestionPayload;
  onSubmit: (payload: CSAttemptAnswerRequest) => void;
  isSubmitting: boolean;
}

export default function CSQuestionPresenter({ question, onSubmit, isSubmitting }: CSQuestionPresenterProps) {
  const [answerText, setAnswerText] = useState('');
  const [selectedChoiceNo, setSelectedChoiceNo] = useState<number | null>(null);

  // 문제가 바뀔 때마다 입력 상태 초기화
  useEffect(() => {
    console.log('[DEBUG] Question changed → resetting input state. New questionId:', question.questionId, 'type:', question.questionType);
    setSelectedChoiceNo(null);
    setAnswerText('');
  }, [question.questionId, question.questionType]);

  const handleSubmit = () => {
    const payload: CSAttemptAnswerRequest = {
      questionId: question.questionId,
    };

    if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'OX') {
      if (selectedChoiceNo === null) {
        console.log('[DEBUG] Validation failed: no choice selected');
        toast.error('선택지를 선택해주세요.');
        return;
      }
      payload.selectedChoiceNo = selectedChoiceNo;
    } else {
      const normalized = answerText.trim();
      if (!normalized) {
        console.log('[DEBUG] Validation failed: empty answer text');
        toast.error('답안을 입력해주세요.');
        return;
      }
      payload.answerText = normalized;
    }

    console.log('[DEBUG] Submitting payload:', JSON.stringify(payload));
    onSubmit(payload);
  };

  const typeLabel = QUESTION_TYPE_LABEL[question.questionType] || question.questionType;

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/10 w-fit rounded-full">
          {typeLabel}
        </span>
        <h2 className="text-xl md:text-2xl font-bold whitespace-pre-wrap leading-relaxed">
          {question.prompt}
        </h2>
      </div>

      {question.choices && question.choices.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          {question.choices.map((choice) => (
            <button
              key={choice.choiceNo}
              onClick={() => {
                console.log('[DEBUG] Choice selected:', choice.choiceNo);
                setSelectedChoiceNo(choice.choiceNo);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                selectedChoiceNo === choice.choiceNo
                  ? 'border-primary bg-primary/5 text-foreground font-medium shadow-[0_2px_0_rgba(var(--primary),0.5)] translate-y-[2px]'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="font-bold mr-3">{choice.choiceNo}.</span>
              {choice.content}
            </button>
          ))}
        </div>
      )}

      {(question.questionType === 'SHORT_ANSWER' || question.questionType === 'ESSAY') && (
        <div className="mt-4">
          <textarea
            className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 resize-none transition-shadow bg-card"
            placeholder={question.questionType === 'ESSAY' ? '답안을 서술해주세요.' : '정답을 입력해주세요.'}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
        </div>
      )}

      {/* 하단 고정 제출 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background/80 backdrop-blur-md z-50 flex justify-center">
        <div className="w-full max-w-2xl px-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full font-bold text-lg h-14 rounded-xl shadow-lg"
            variant="default"
          >
            {isSubmitting ? '채점 중...' : '제출하기'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

