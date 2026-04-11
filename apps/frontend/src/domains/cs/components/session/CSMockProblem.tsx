'use client';

import React, { useState } from 'react';
import { CSQuestionPayload, CSAttemptAnswerRequest } from '@/domains/cs/api/csApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CSMockProblemProps {
  question: CSQuestionPayload;
  onSubmit: (payload: CSAttemptAnswerRequest) => void;
  isSubmitting: boolean;
}

export default function CSMockProblem({ question, onSubmit, isSubmitting }: CSMockProblemProps) {
  const [answerText, setAnswerText] = useState('');
  const [selectedChoiceNo, setSelectedChoiceNo] = useState<number | null>(null);

  const handleSubmitMockCorrect = () => {
    // 임의의 정답 제출 (테스트용)
    const payload: CSAttemptAnswerRequest = {
      questionId: question.questionId,
    };

    if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'OX') {
      // 선택지 중 첫 번째를 임시 정답으로 보냄 (또는 사용자가 선택한 값)
      payload.selectedChoiceNo = selectedChoiceNo ?? (question.choices?.[0]?.choiceNo || 1);
    } else {
      const normalized = answerText.trim();
      payload.answerText = normalized ? `정답 ${normalized}` : '정답';
    }

    onSubmit(payload);
  };

  const handleSubmitMockWrong = () => {
    // 임의의 오답 제출 (테스트용)
    const payload: CSAttemptAnswerRequest = {
      questionId: question.questionId,
    };

    if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'OX') {
      payload.selectedChoiceNo = selectedChoiceNo ?? (question.choices?.[1]?.choiceNo || 2);
    } else {
      const normalized = answerText.trim();
      payload.answerText = normalized ? `오답 ${normalized}` : '오답';
    }

    onSubmit(payload);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/10 w-fit rounded-full">
          {question.questionType}
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
              onClick={() => setSelectedChoiceNo(choice.choiceNo)}
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
            className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 resize-none transition-shadow"
            placeholder="답안을 입력하세요 (테스트용)"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
        </div>
      )}

      {/* Mock Tests Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 pt-6 border-t border-dashed">
        <p className="w-full text-sm text-muted-foreground text-center sm:text-left mb-2 sm:mb-0 sm:hidden">
          [Mock 테스트 패널]
        </p>
        <Button
          onClick={handleSubmitMockCorrect}
          disabled={isSubmitting}
          className="flex-1 font-bold text-base h-12"
          variant="default"
        >
          {isSubmitting ? '채점 중...' : '정답 제출 (Mock)'}
        </Button>
        <Button
          onClick={handleSubmitMockWrong}
          disabled={isSubmitting}
          className="flex-1 font-bold text-base h-12"
          variant="destructive"
        >
          오답 제출 (Mock)
        </Button>
      </div>
    </Card>
  );
}
