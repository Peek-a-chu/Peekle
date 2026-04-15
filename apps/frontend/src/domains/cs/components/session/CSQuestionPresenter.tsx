'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  isInteractionLocked?: boolean;
}

type ParsedContentBlock = Record<string, unknown>;
const MULTI_BLANK_DELIMITER = '|||';

export default function CSQuestionPresenter({
  question,
  onSubmit,
  isSubmitting,
  isInteractionLocked = false,
}: CSQuestionPresenterProps) {
  const [answerText, setAnswerText] = useState('');
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [selectedChoiceNo, setSelectedChoiceNo] = useState<number | null>(null);
  const submitLockRef = useRef(false);
  const parsedContentBlocks = useMemo(
    () => parseQuestionContentBlocks(question.contentMode, question.contentBlocks),
    [question.contentMode, question.contentBlocks],
  );
  const multiBlankCount = useMemo(
    () => resolveMultiBlankCount(question.metadata, parsedContentBlocks),
    [question.metadata, parsedContentBlocks],
  );
  const multiBlankLabels = useMemo(
    () => resolveMultiBlankLabels(parsedContentBlocks, multiBlankCount),
    [parsedContentBlocks, multiBlankCount],
  );
  const isMultiBlankQuestion =
    question.questionType === 'SHORT_ANSWER' &&
    (question.gradingMode === 'MULTI_BLANK_ORDERED' || question.gradingMode === 'ORDERING') &&
    multiBlankCount > 1;
  const displayedContentBlocks = useMemo(
    () =>
      parsedContentBlocks.filter((block) => {
        if (!isMultiBlankQuestion) return true;
        const type = String(block.type ?? '').toUpperCase();
        return type !== 'MULTI_BOX';
      }),
    [isMultiBlankQuestion, parsedContentBlocks],
  );

  // 문제가 바뀔 때마다 입력 상태 초기화
  useEffect(() => {
    console.log('[DEBUG] Question changed → resetting input state. New questionId:', question.questionId, 'type:', question.questionType);
    setSelectedChoiceNo(null);
    setAnswerText('');
    setBlankAnswers(
      isMultiBlankQuestion
        ? Array.from({ length: multiBlankCount }, () => '')
        : [],
    );
    submitLockRef.current = false;
  }, [question.questionId, question.questionType, isMultiBlankQuestion, multiBlankCount]);

  useEffect(() => {
    if (!isSubmitting && !isInteractionLocked) {
      submitLockRef.current = false;
    }
  }, [isSubmitting, isInteractionLocked]);

  const isChoiceQuestion = question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'OX';
  const isSubjectiveQuestion = question.questionType === 'SHORT_ANSWER' || question.questionType === 'ESSAY';

  const handleSubmit = useCallback(() => {
    if (isSubmitting || isInteractionLocked || submitLockRef.current) {
      return;
    }

    const payload: CSAttemptAnswerRequest = {
      questionId: question.questionId,
    };

    if (isChoiceQuestion) {
      if (selectedChoiceNo === null) {
        console.log('[DEBUG] Validation failed: no choice selected');
        toast.error('선택지를 선택해주세요.');
        return;
      }
      payload.selectedChoiceNo = selectedChoiceNo;
    } else {
      if (isMultiBlankQuestion) {
        const normalizedParts = blankAnswers.map((answer) => answer.trim());
        if (normalizedParts.length !== multiBlankCount || normalizedParts.some((part) => !part)) {
          console.log('[DEBUG] Validation failed: empty multi-blank answer');
          toast.error('모든 빈칸 답안을 입력해주세요.');
          return;
        }
        payload.answerText = normalizedParts.join(MULTI_BLANK_DELIMITER);
      } else {
        const normalized = answerText.trim();
        if (!normalized) {
          console.log('[DEBUG] Validation failed: empty answer text');
          toast.error('답안을 입력해주세요.');
          return;
        }
        payload.answerText = normalized;
      }
    }

    submitLockRef.current = true;
    console.log('[DEBUG] Submitting payload:', JSON.stringify(payload));
    onSubmit(payload);
  }, [
    answerText,
    blankAnswers,
    isChoiceQuestion,
    isMultiBlankQuestion,
    isSubmitting,
    isInteractionLocked,
    multiBlankCount,
    onSubmit,
    question.questionId,
    selectedChoiceNo,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (isSubmitting || isInteractionLocked) return;

      if (isChoiceQuestion) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleSubmit();
        return;
      }

      if (isSubjectiveQuestion && event.key === 'Enter') {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const tagName = target.tagName;
        if (tagName !== 'TEXTAREA' && !(isMultiBlankQuestion && tagName === 'INPUT')) return;
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSubmit, isChoiceQuestion, isInteractionLocked, isMultiBlankQuestion, isSubjectiveQuestion, isSubmitting]);

  const typeLabel = QUESTION_TYPE_LABEL[question.questionType] || question.questionType;
  const hasTextAnswer = answerText.trim().length > 0;
  const isMultiBlankReady =
    isMultiBlankQuestion &&
    blankAnswers.length === multiBlankCount &&
    blankAnswers.every((value) => value.trim().length > 0);
  const isAnswerReady = isChoiceQuestion ? selectedChoiceNo !== null : isMultiBlankQuestion ? isMultiBlankReady : hasTextAnswer;
  const isSubmitDisabled = isSubmitting || isInteractionLocked || !isAnswerReady;

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

      {displayedContentBlocks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          {displayedContentBlocks.map((block, index) => (
            <QuestionContentBlock key={`block-${index}`} block={block} />
          ))}
        </div>
      )}

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

      {(question.questionType === 'SHORT_ANSWER' || question.questionType === 'ESSAY') && !isMultiBlankQuestion && (
        <div className="mt-4">
          <textarea
            className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 resize-none transition-shadow bg-card"
            placeholder={question.questionType === 'ESSAY' ? '답안을 서술해주세요.' : '정답을 입력해주세요.'}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
        </div>
      )}

      {isMultiBlankQuestion && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">각 빈칸의 답을 순서대로 입력해주세요.</p>
          {Array.from({ length: multiBlankCount }, (_, index) => (
            <div key={`blank-${index}`} className="flex items-center gap-2">
              <span className="w-14 text-sm font-semibold text-muted-foreground">
                {multiBlankLabels[index] ?? `(${toAlphabetLabel(index)})`}
              </span>
              <input
                type="text"
                className="w-full h-11 px-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none bg-card"
                value={blankAnswers[index] ?? ''}
                onChange={(event) => {
                  const next = [...blankAnswers];
                  next[index] = event.target.value;
                  setBlankAnswers(next);
                }}
                placeholder={`${index + 1}번 답`}
              />
            </div>
          ))}
        </div>
      )}

      {/* 하단 고정 제출 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background/80 backdrop-blur-md z-50 flex justify-center">
        <div className="w-full max-w-2xl px-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="w-full font-bold text-lg h-14 rounded-xl shadow-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-100 disabled:shadow-none"
            variant="default"
          >
            {isSubmitting ? '채점 중...' : '제출하기'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function resolveMultiBlankCount(
  metadata: string | null | undefined,
  parsedContentBlocks: ParsedContentBlock[],
): number {
  const metadataCount = extractCountFromMetadata(metadata, ['blankCount', 'itemCount']);
  if (metadataCount > 1) {
    return metadataCount;
  }

  for (const block of parsedContentBlocks) {
    const type = String(block.type ?? '').toUpperCase();
    if (type !== 'MULTI_BOX') continue;
    const boxes = Array.isArray(block.boxes) ? block.boxes : [];
    if (boxes.length > 1) {
      return boxes.length;
    }
  }

  return 0;
}

function extractCountFromMetadata(metadata: string | null | undefined, keys: string[]): number {
  if (!metadata) return 0;
  try {
    const parsed = JSON.parse(metadata);
    if (!parsed || typeof parsed !== 'object') {
      return 0;
    }
    const safeParsed = parsed as Record<string, unknown>;
    for (const key of keys) {
      const value = safeParsed[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
      if (typeof value === 'string') {
        const numericValue = Number.parseInt(value, 10);
        if (!Number.isNaN(numericValue) && numericValue > 0) {
          return numericValue;
        }
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

function resolveMultiBlankLabels(parsedContentBlocks: ParsedContentBlock[], blankCount: number): string[] {
  for (const block of parsedContentBlocks) {
    const type = String(block.type ?? '').toUpperCase();
    if (type !== 'MULTI_BOX') continue;

    const boxes = Array.isArray(block.boxes) ? block.boxes : [];
    if (boxes.length === 0) break;

    const labels = boxes.slice(0, blankCount).map((box, index) => {
      const safeBox = typeof box === 'object' && box !== null ? (box as Record<string, unknown>) : {};
      const label = safeBox.label;
      if (typeof label === 'string' && label.trim().length > 0) {
        return label.trim();
      }
      return `(${toAlphabetLabel(index)})`;
    });

    return labels;
  }

  return Array.from({ length: blankCount }, (_, index) => `(${toAlphabetLabel(index)})`);
}

function toAlphabetLabel(index: number): string {
  const normalized = Math.max(0, index);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const base = alphabet[normalized % alphabet.length] ?? 'a';
  return base;
}

function QuestionContentBlock({ block }: { block: ParsedContentBlock }) {
  const type = String(block.type ?? '').toUpperCase();

  if (type === 'TEXT') {
    const text = typeof block.text === 'string' ? block.text : '';
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  }

  if (type === 'IMAGE') {
    const url = typeof block.url === 'string' ? block.url : typeof block.src === 'string' ? block.src : '';
    const alt = typeof block.alt === 'string' ? block.alt : '문제 이미지';
    if (!url) return null;
    return (
      <div className="overflow-hidden rounded-lg border bg-background">
        <img src={url} alt={alt} className="w-full max-h-[420px] object-contain bg-black/5" loading="lazy" />
      </div>
    );
  }

  if (type === 'CODE') {
    const language = typeof block.language === 'string' ? block.language.trim() : '';
    const code =
      typeof block.code === 'string'
        ? block.code
        : typeof block.text === 'string'
          ? block.text
          : '';
    if (!code) return null;
    return (
      <div className="overflow-hidden rounded-lg border bg-slate-950 text-slate-100">
        {language && (
          <div className="border-b border-slate-800 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-300">
            {language}
          </div>
        )}
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (type === 'TABLE') {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    return (
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {headers.map((header, index) => (
                <th key={`h-${index}`} className="px-3 py-2 text-left font-semibold border-b">
                  {String(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`r-${rowIndex}`} className="border-b last:border-b-0">
                {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                  <td key={`c-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'MULTI_BOX') {
    const boxes = Array.isArray(block.boxes) ? block.boxes : [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {boxes.map((box, index) => {
          const safeBox = typeof box === 'object' && box !== null ? (box as Record<string, unknown>) : {};
          const label = typeof safeBox.label === 'string' ? safeBox.label : `빈칸 ${index + 1}`;
          return (
            <div key={`b-${index}`} className="rounded-md border border-dashed px-3 py-2 bg-background">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="h-7 rounded bg-muted/40" />
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'DIAGRAM') {
    const nodes = Array.isArray(block.nodes) ? block.nodes : [];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {nodes.map((node, index) => (
          <React.Fragment key={`n-${index}`}>
            <span className="rounded-md border px-2 py-1 text-xs bg-background">{String(node)}</span>
            {index < nodes.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return null;
}

function parseQuestionContentBlocks(
  contentMode: CSQuestionPayload['contentMode'],
  rawContentBlocks: string | null | undefined,
): ParsedContentBlock[] {
  if (contentMode !== 'BLOCKS' || !rawContentBlocks) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawContentBlocks);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item === 'object') as ParsedContentBlock[];
  } catch {
    return [];
  }
}

