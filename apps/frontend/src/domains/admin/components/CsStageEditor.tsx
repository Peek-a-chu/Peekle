'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchAdminStageQuestions,
  importAdminStageQuestions,
  updateAdminQuestion,
  CSAdminQuestion,
  CSAdminQuestionChoice,
  CSAdminQuestionShortAnswer,
  CSAdminQuestionDraft,
  CSAdminStageQuestionImportRequest
} from '@/domains/cs/api/csAdminApi';
import { CSQuestionType } from '@/domains/cs/api/csApi';
import { RefreshCw, Upload, Edit, Save, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CsStageEditor({ stageId }: { stageId: number }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<CSAdminQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStageQuestions(stageId);
      setQuestions(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
    setIsJsonMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);

  const handleToggleJsonMode = async () => {
    if (isJsonMode) {
      setIsJsonMode(false);
      return;
    }

    try {
      const latestQuestions = await fetchAdminStageQuestions(stageId);
      setQuestions(latestQuestions);
      const jsonDraft =
        latestQuestions.length > 0 ? toJsonDraft(latestQuestions) : buildEmptyStageExampleDraft();
      setJsonText(JSON.stringify(jsonDraft, null, 2));
      setIsJsonMode(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  const handleJsonImport = async () => {
    try {
      if (!jsonText.trim()) throw new Error('JSON 내용을 입력해주세요.');
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('JSON은 문제 배열이어야 합니다.');

      validateJsonDraft(parsed);
      
      const payload: CSAdminStageQuestionImportRequest = {
        mode: 'REPLACE',
        questions: parsed
      };

      await importAdminStageQuestions(stageId, payload);
      toast({ title: 'JSON 업로드 성공', description: '문제 세트가 교체되었습니다.' });
      setIsJsonMode(false);
      setJsonText('');
      loadQuestions();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'JSON 오류', description: err.message });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          총 {questions.length}개 문제
          {isJsonMode ? ' · JSON 수정 모드' : ' · GUI 편집 모드'}
        </p>
        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleToggleJsonMode}>
          {isJsonMode ? 'GUI 모드 보기' : 'JSON 모드'}
        </Button>
        <Button variant="outline" size="sm" onClick={loadQuestions} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> 새로고침
        </Button>
        </div>
      </div>

      {isJsonMode ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">JSON 가져오기 (전체 교체)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              className="font-mono text-xs min-h-[260px]"
              placeholder={`[
  {
    "questionType": "SHORT_ANSWER",
    "prompt": "문제 내용",
    "explanation": "해설 내용",
    "shortAnswers": [{ "answerText": "정답", "isPrimary": true }]
  }
]`}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleJsonImport}>
                <Upload className="h-4 w-4 mr-1" /> 스테이지 문제 교체
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 min-h-[220px] max-h-[62vh] overflow-y-auto pr-1">
          {questions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              문제가 없습니다. JSON을 통해 등록해주세요.
            </div>
          ) : (
            questions.map((q, index) => (
              <QuestionFormItem
                key={q.questionId}
                stageId={stageId}
                question={q}
                index={index}
                onUpdate={loadQuestions}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function QuestionFormItem({
  stageId,
  question,
  index,
  onUpdate,
}: {
  stageId: number;
  question: CSAdminQuestion;
  index: number;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [questionType, setQuestionType] = useState<CSQuestionType>(question.questionType);
  const [promptText, setPromptText] = useState(question.prompt);
  const [explanationText, setExplanationText] = useState(question.explanation ?? '');
  const [choices, setChoices] = useState<CSAdminQuestionChoice[]>(toEditableChoices(question));
  const [shortAnswers, setShortAnswers] = useState<CSAdminQuestionShortAnswer[]>(
    toEditableShortAnswers(question),
  );

  useEffect(() => {
    setQuestionType(question.questionType);
    setPromptText(question.prompt);
    setExplanationText(question.explanation ?? '');
    setChoices(toEditableChoices(question));
    setShortAnswers(toEditableShortAnswers(question));
  }, [question]);

  const handleTypeChange = (nextType: CSQuestionType) => {
    setQuestionType(nextType);
    if (nextType === 'SHORT_ANSWER') {
      setShortAnswers((prev) => (prev.length > 0 ? prev : [{ answerText: '', isPrimary: true }]));
      return;
    }

    if (nextType === 'OX') {
      setChoices([
        { choiceNo: 1, content: 'O', isAnswer: true },
        { choiceNo: 2, content: 'X', isAnswer: false },
      ]);
      return;
    }

    setChoices((prev) =>
      prev.length >= 2
        ? prev.map((choice, i) => ({ ...choice, choiceNo: i + 1 }))
        : [
            { choiceNo: 1, content: '', isAnswer: true },
            { choiceNo: 2, content: '', isAnswer: false },
          ],
    );
  };

  const handleAddChoice = () => {
    if (questionType !== 'MULTIPLE_CHOICE') return;
    const nextNo = choices.length + 1;
    setChoices([...choices, { choiceNo: nextNo, content: '', isAnswer: false }]);
  };

  const handleRemoveChoice = (indexToRemove: number) => {
    if (questionType !== 'MULTIPLE_CHOICE') return;
    if (choices.length <= 2) return;
    const nextChoices = choices.filter((_, i) => i !== indexToRemove).map((choice, i) => ({
      ...choice,
      choiceNo: i + 1,
    }));

    if (!nextChoices.some((choice) => choice.isAnswer)) {
      nextChoices[0] = { ...nextChoices[0], isAnswer: true };
    }
    setChoices(nextChoices);
  };

  const handleUpdateChoiceContent = (idx: number, value: string) => {
    const next = [...choices];
    next[idx].content = value;
    setChoices(next);
  };

  const handleSetAnswerChoice = (idx: number) => {
    setChoices(
      choices.map((choice, i) => ({
        ...choice,
        isAnswer: i === idx,
      })),
    );
  };

  const handleAddShortAnswer = () => {
    setShortAnswers([...shortAnswers, { answerText: '', isPrimary: false }]);
  };

  const handleUpdateShortAnswerText = (i: number, val: string) => {
    const updated = [...shortAnswers];
    updated[i].answerText = val;
    setShortAnswers(updated);
  };

  const handleSetPrimaryShortAnswer = (i: number) => {
    setShortAnswers(
      shortAnswers.map((answer, idx) => ({
        ...answer,
        isPrimary: idx === i,
      })),
    );
  };

  const handleRemoveShortAnswer = (i: number) => {
    setShortAnswers(shortAnswers.filter((_, idx) => idx !== i));
  };

  const validateBeforeSave = () => {
    if (!promptText.trim()) {
      throw new Error('문제 본문은 비어 있을 수 없습니다.');
    }
    if (!explanationText.trim()) {
      throw new Error('해설은 비어 있을 수 없습니다.');
    }

    if (questionType === 'SHORT_ANSWER') {
      const texts = shortAnswers.map((answer) => answer.answerText.trim());
      if (texts.length === 0) {
        throw new Error('단답형 정답은 최소 1개 이상이어야 합니다.');
      }
      if (texts.some((text) => !text)) {
        throw new Error('비어있는 정답 칸이 있습니다.');
      }
      const unique = new Set(texts.map((text) => text.toLowerCase().replace(/\s+/g, '')));
      if (unique.size !== texts.length) {
        throw new Error('중복된 정답이 존재합니다.');
      }
      return;
    }

    if (questionType === 'OX' && choices.length !== 2) {
      throw new Error('OX 문제는 선택지가 정확히 2개여야 합니다.');
    }
    if (questionType === 'MULTIPLE_CHOICE' && choices.length < 2) {
      throw new Error('객관식 문제는 선택지가 2개 이상이어야 합니다.');
    }
    if (choices.some((choice) => !choice.content.trim())) {
      throw new Error('비어있는 선택지 내용이 있습니다.');
    }
    if (choices.filter((choice) => choice.isAnswer).length !== 1) {
      throw new Error('정답 선택지는 정확히 1개여야 합니다.');
    }
  };

  const buildPayload = (): CSAdminQuestionDraft => {
    const base = {
      questionType,
      prompt: promptText.trim(),
      explanation: explanationText.trim(),
    };

    if (questionType === 'SHORT_ANSWER') {
      const normalized = shortAnswers.map((answer, i) => ({
        answerText: answer.answerText.trim(),
        isPrimary: Boolean(answer.isPrimary),
      }));
      if (!normalized.some((answer) => answer.isPrimary) && normalized.length > 0) {
        normalized[0].isPrimary = true;
      }
      return {
        ...base,
        shortAnswers: normalized,
      };
    }

    return {
      ...base,
      choices: choices.map((choice, i) => ({
        choiceNo: i + 1,
        content: choice.content.trim(),
        isAnswer: choice.isAnswer,
      })),
    };
  };

  const handleSave = async () => {
    try {
      validateBeforeSave();
      const payload = buildPayload();
      await updateAdminQuestion(stageId, question.questionId, payload);
      toast({ title: '문제 수정 성공' });
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err?.message ?? '문제 수정에 실패했습니다.' });
    }
  };

  return (
    <Card className="border-muted/70">
      <CardContent className="p-3 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="pr-3">
            <span className="font-bold mr-2">Q{index + 1}.</span>
            <span className="text-sm font-medium border px-1 rounded bg-secondary/50 mr-2">{question.questionType}</span>
            <span className="text-sm">{question.prompt}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}>
            {isEditing ? '취소' : <Edit className="h-4 w-4" />}
          </Button>
        </div>

        {isEditing ? (
          <div className="text-sm bg-muted/20 p-2.5 rounded border flex flex-col gap-2.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <label className="text-xs text-muted-foreground">문제 유형</label>
              <select
                className="md:col-span-2 border rounded px-2 py-1 bg-background"
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value as CSQuestionType)}
              >
                <option value="MULTIPLE_CHOICE">객관식</option>
                <option value="OX">OX</option>
                <option value="SHORT_ANSWER">단답형</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-xs text-muted-foreground">문제 본문</label>
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="min-h-[72px]"
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-xs text-muted-foreground">해설</label>
              <Textarea
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                className="min-h-[56px]"
              />
            </div>

            {questionType === 'SHORT_ANSWER' ? (
              <div className="flex flex-col gap-1.5">
                <div className="font-semibold text-sm">단답형 정답 (다중 허용)</div>
                {shortAnswers.map((ans, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={Boolean(ans.isPrimary)}
                      onChange={() => handleSetPrimaryShortAnswer(i)}
                      title="대표 정답"
                    />
                    <Input
                      value={ans.answerText}
                      onChange={(e) => handleUpdateShortAnswerText(i, e.target.value)}
                      placeholder="정답"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShortAnswer(i)}
                      className="h-8 w-8 text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddShortAnswer} className="w-fit">
                  <Plus className="h-4 w-4 mr-1" /> 정답 추가
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="font-semibold text-sm">선택지</div>
                {choices.map((choice, i) => (
                  <div key={`${choice.choiceNo}-${i}`} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={choice.isAnswer}
                      onChange={() => handleSetAnswerChoice(i)}
                      title="정답 선택"
                    />
                    <span className="w-7 text-xs text-muted-foreground">{i + 1}.</span>
                    <Input
                      value={choice.content}
                      onChange={(e) => handleUpdateChoiceContent(i, e.target.value)}
                      className="h-8 text-sm"
                    />
                    {questionType === 'MULTIPLE_CHOICE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChoice(i)}
                        className="h-8 w-8 text-destructive"
                        disabled={choices.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {questionType === 'MULTIPLE_CHOICE' && (
                  <Button variant="outline" size="sm" onClick={handleAddChoice} className="w-fit">
                    <Plus className="h-4 w-4 mr-1" /> 선택지 추가
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end mt-1">
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> 저장
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm bg-muted/20 p-2.5 rounded border">
            {question.questionType === 'SHORT_ANSWER' ? (
              <>
                <div className="font-semibold mb-2">단답형 정답</div>
                <ul className="list-disc list-inside">
                  {question.shortAnswers?.map((ans, i) => (
                    <li key={i}>
                      {ans.answerText}{' '}
                      {ans.isPrimary && <span className="text-xs text-primary">(대표 정답)</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="font-semibold mb-2">선택지</div>
                <ul className="list-disc list-inside">
                  {question.choices?.map((choice, i) => (
                    <li key={i}>
                      {choice.choiceNo}. {choice.content}{' '}
                      {choice.isAnswer && <span className="text-xs text-primary">(정답)</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function toJsonDraft(questions: CSAdminQuestion[]): CSAdminQuestionDraft[] {
  return questions.map((question) => {
    const base: CSAdminQuestionDraft = {
      questionType: question.questionType,
      prompt: question.prompt,
      explanation: question.explanation ?? '',
    };

    if (question.questionType === 'SHORT_ANSWER') {
      return {
        ...base,
        shortAnswers: question.shortAnswers?.map((answer) => ({
          answerText: answer.answerText,
          isPrimary: answer.isPrimary,
        })) ?? [],
      };
    }

    return {
      ...base,
      choices: question.choices?.map((choice) => ({
        choiceNo: choice.choiceNo,
        content: choice.content,
        isAnswer: choice.isAnswer,
      })) ?? [],
    };
  });
}

function buildEmptyStageExampleDraft(): CSAdminQuestionDraft[] {
  return [
    {
      questionType: 'OX',
      prompt: '제목1',
      explanation: '해설1',
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: true },
        { choiceNo: 2, content: 'X', isAnswer: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목2',
      explanation: '해설2',
      choices: [
        { choiceNo: 1, content: '선택지2-1', isAnswer: true },
        { choiceNo: 2, content: '선택지2-2', isAnswer: false },
        { choiceNo: 3, content: '선택지2-3', isAnswer: false },
        { choiceNo: 4, content: '선택지2-4', isAnswer: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '제목3',
      explanation: '해설3',
      shortAnswers: [
        { answerText: '정답3', isPrimary: true },
        { answerText: '정답3_보조', isPrimary: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목4',
      explanation: '해설4',
      choices: [
        { choiceNo: 1, content: '선택지4-1', isAnswer: false },
        { choiceNo: 2, content: '선택지4-2', isAnswer: true },
        { choiceNo: 3, content: '선택지4-3', isAnswer: false },
        { choiceNo: 4, content: '선택지4-4', isAnswer: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '제목5',
      explanation: '해설5',
      shortAnswers: [
        { answerText: '정답5', isPrimary: true },
        { answerText: '정답5_보조', isPrimary: false },
      ],
    },
    {
      questionType: 'OX',
      prompt: '제목6',
      explanation: '해설6',
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: false },
        { choiceNo: 2, content: 'X', isAnswer: true },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목7',
      explanation: '해설7',
      choices: [
        { choiceNo: 1, content: '선택지7-1', isAnswer: false },
        { choiceNo: 2, content: '선택지7-2', isAnswer: false },
        { choiceNo: 3, content: '선택지7-3', isAnswer: true },
        { choiceNo: 4, content: '선택지7-4', isAnswer: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '제목8',
      explanation: '해설8',
      shortAnswers: [
        { answerText: '정답8', isPrimary: true },
        { answerText: '정답8_보조', isPrimary: false },
      ],
    },
    {
      questionType: 'OX',
      prompt: '제목9',
      explanation: '해설9',
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: true },
        { choiceNo: 2, content: 'X', isAnswer: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목10',
      explanation: '해설10',
      choices: [
        { choiceNo: 1, content: '선택지10-1', isAnswer: false },
        { choiceNo: 2, content: '선택지10-2', isAnswer: false },
        { choiceNo: 3, content: '선택지10-3', isAnswer: false },
        { choiceNo: 4, content: '선택지10-4', isAnswer: true },
      ],
    },
  ];
}

function validateJsonDraft(rawQuestions: unknown) {
  if (!Array.isArray(rawQuestions)) {
    throw new Error('문제 배열(JSON Array) 형식이어야 합니다.');
  }

  if (rawQuestions.length !== 10) {
    throw new Error('스테이지 문제는 정확히 10개여야 합니다.');
  }

  rawQuestions.forEach((rawQuestion, index) => {
    const position = index + 1;
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      throw new Error(`${position}번 문제 형식이 올바르지 않습니다.`);
    }

    const question = rawQuestion as CSAdminQuestionDraft;
    validateQuestionType(question.questionType, position);

    if (!question.prompt || !question.prompt.trim()) {
      throw new Error(`${position}번 문제의 prompt는 필수입니다.`);
    }
    if (!question.explanation || !question.explanation.trim()) {
      throw new Error(`${position}번 문제의 explanation은 필수입니다.`);
    }

    if (question.questionType === 'SHORT_ANSWER') {
      validateShortAnswers(question.shortAnswers, position);
      return;
    }

    validateChoices(question.choices, question.questionType, position);
  });
}

function validateQuestionType(type: CSQuestionType | undefined, position: number) {
  if (!type || !['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'OX'].includes(type)) {
    throw new Error(`${position}번 문제의 questionType이 올바르지 않습니다.`);
  }
}

function validateChoices(
  choices: CSAdminQuestionDraft['choices'],
  questionType: CSQuestionType,
  position: number,
) {
  if (!choices || choices.length === 0) {
    throw new Error(`${position}번 문제의 choices가 비어 있습니다.`);
  }

  if (questionType === 'OX' && choices.length !== 2) {
    throw new Error(`${position}번 OX 문제는 선택지가 정확히 2개여야 합니다.`);
  }

  if (questionType === 'MULTIPLE_CHOICE' && choices.length < 2) {
    throw new Error(`${position}번 객관식 문제는 선택지가 2개 이상이어야 합니다.`);
  }

  const choiceNoSet = new Set<number>();
  let answerCount = 0;

  choices.forEach((choice) => {
    if (!choice.content?.trim()) {
      throw new Error(`${position}번 문제의 선택지 내용이 비어 있습니다.`);
    }

    if (choiceNoSet.has(choice.choiceNo)) {
      throw new Error(`${position}번 문제의 choiceNo가 중복되었습니다.`);
    }
    choiceNoSet.add(choice.choiceNo);

    if (choice.isAnswer) answerCount += 1;
  });

  if (answerCount !== 1) {
    throw new Error(`${position}번 문제의 정답 선택지는 정확히 1개여야 합니다.`);
  }
}

function validateShortAnswers(shortAnswers: CSAdminQuestionDraft['shortAnswers'], position: number) {
  if (!shortAnswers || shortAnswers.length === 0) {
    throw new Error(`${position}번 단답형 문제는 shortAnswers가 1개 이상 필요합니다.`);
  }

  const normalizedSet = new Set<string>();
  shortAnswers.forEach((answer) => {
    const text = answer.answerText?.trim();
    if (!text) {
      throw new Error(`${position}번 단답형 문제의 answerText가 비어 있습니다.`);
    }

    const normalized = text.toLowerCase().replace(/\s+/g, '');
    if (normalizedSet.has(normalized)) {
      throw new Error(`${position}번 단답형 문제의 정답이 중복되었습니다.`);
    }
    normalizedSet.add(normalized);
  });
}

function toEditableChoices(question: CSAdminQuestion): CSAdminQuestionChoice[] {
  const mapped = (question.choices ?? [])
    .map((choice) => ({
      choiceNo: choice.choiceNo,
      content: choice.content,
      isAnswer: choice.isAnswer,
    }))
    .sort((a, b) => a.choiceNo - b.choiceNo);

  if (question.questionType === 'OX') {
    if (mapped.length === 2) return mapped;
    return [
      { choiceNo: 1, content: 'O', isAnswer: true },
      { choiceNo: 2, content: 'X', isAnswer: false },
    ];
  }

  if (mapped.length >= 2) return mapped;
  return [
    { choiceNo: 1, content: '', isAnswer: true },
    { choiceNo: 2, content: '', isAnswer: false },
  ];
}

function toEditableShortAnswers(question: CSAdminQuestion): CSAdminQuestionShortAnswer[] {
  const mapped = (question.shortAnswers ?? []).map((answer) => ({
    answerText: answer.answerText,
    isPrimary: answer.isPrimary,
  }));
  return mapped.length > 0 ? mapped : [{ answerText: '', isPrimary: true }];
}
