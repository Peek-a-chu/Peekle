'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  CSAdminStageQuestionImportRequest,
  uploadAdminQuestionImage,
} from '@/domains/cs/api/csAdminApi';
import {
  CSQuestionContentMode,
  CSQuestionGradingMode,
  CSQuestionType,
} from '@/domains/cs/api/csApi';
import { RefreshCw, Upload, Edit, Save, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CsStageEditorProps {
  stageId: number;
  maxQuestionCount?: number;
  exactQuestionCount?: number | null;
}

type ShortAnswerMode = 'SINGLE' | 'MULTI_BLANK_ORDERED';

export default function CsStageEditor({
  stageId,
  maxQuestionCount = 10,
  exactQuestionCount = 10,
}: CsStageEditorProps) {
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

      validateJsonDraft(parsed, { maxQuestionCount, exactQuestionCount });
      
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

  const handleLoadNewTypeExample = () => {
    setJsonText(JSON.stringify(buildNewTypeExampleDraft(), null, 2));
    toast({ title: '예시 JSON 반영', description: '멀티박스/테이블/코드블럭 예시를 불러왔습니다.' });
  };

  const questionCountHint = exactQuestionCount === null
    ? `최대 ${maxQuestionCount}개`
    : `정확히 ${exactQuestionCount}개`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          총 {questions.length}개 문제
          {` · ${questionCountHint}`}
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
    "prompt": "애플리케이션 성능 지표 3가지를 순서대로 작성하시오.",
    "explanation": "정답 순서: 처리량, 응답시간, 경과시간",
    "contentMode": "BLOCKS",
    "contentBlocks": "[{\\"type\\":\\"TEXT\\",\\"text\\":\\"표를 보고 (a),(b),(c)에 들어갈 용어를 순서대로 입력하세요.\\"},{\\"type\\":\\"TABLE\\",\\"headers\\":[\\"지표\\",\\"설명\\"],\\"rows\\":[[\\"(a)\\",\\"주어진 시간에 처리 가능한 트랜잭션 수\\"],[\\"(b)\\",\\"사용자 입력 후 응답 시작까지 걸린 시간\\"],[\\"(c)\\",\\"입력 시점부터 결과 출력 완료까지 걸린 시간\\"]]}, {\\"type\\":\\"MULTI_BOX\\",\\"boxes\\":[{\\"key\\":\\"a\\",\\"label\\":\\"(a)\\"},{\\"key\\":\\"b\\",\\"label\\":\\"(b)\\"},{\\"key\\":\\"c\\",\\"label\\":\\"(c)\\"}]}, {\\"type\\":\\"CODE\\",\\"language\\":\\"sql\\",\\"code\\":\\"SELECT * FROM performance_metrics;\\"}]",
    "gradingMode": "MULTI_BLANK_ORDERED",
    "metadata": "{\\"blankCount\\":3}",
    "shortAnswers": [
      { "answerText": "처리량", "isPrimary": true },
      { "answerText": "응답시간", "isPrimary": false },
      { "answerText": "경과시간", "isPrimary": false }
    ]
  }
]`}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={handleLoadNewTypeExample}>
                신규 유형 예시 넣기
              </Button>
              <Button size="sm" onClick={handleJsonImport}>
                <Upload className="h-4 w-4 mr-1" /> 스테이지 문제 교체
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 min-h-[220px] max-h-[62vh] overflow-y-auto pr-1">
          <QuestionCreateCard
            stageId={stageId}
            canCreate={questions.length < maxQuestionCount}
            remainingCount={Math.max(maxQuestionCount - questions.length, 0)}
            onCreated={loadQuestions}
          />
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

function QuestionCreateCard({
  stageId,
  canCreate,
  remainingCount,
  onCreated,
}: {
  stageId: number;
  canCreate: boolean;
  remainingCount: number;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [questionType, setQuestionType] = useState<CSQuestionType>('MULTIPLE_CHOICE');
  const [shortAnswerMode, setShortAnswerMode] = useState<ShortAnswerMode>('SINGLE');
  const [promptText, setPromptText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [choices, setChoices] = useState<CSAdminQuestionChoice[]>([
    { choiceNo: 1, content: '', isAnswer: true },
    { choiceNo: 2, content: '', isAnswer: false },
  ]);
  const [shortAnswers, setShortAnswers] = useState<CSAdminQuestionShortAnswer[]>([
    { answerText: '', isPrimary: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const createImageFileRef = useRef<HTMLInputElement | null>(null);

  const handleTypeChange = (nextType: CSQuestionType) => {
    setQuestionType(nextType);
    if (nextType === 'SHORT_ANSWER') {
      setShortAnswerMode('SINGLE');
    }
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
    setChoices([...choices, { choiceNo: choices.length + 1, content: '', isAnswer: false }]);
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

  const handleImageUploadClick = () => {
    createImageFileRef.current?.click();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validateImageFile(file);
      setUploadingImage(true);
      const uploadedUrl = await uploadAdminQuestionImage(file);
      setImageUrl(uploadedUrl);
      toast({ title: '이미지 업로드 성공', description: '문제 이미지 URL이 자동 입력되었습니다.' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: err?.message ?? '이미지 업로드에 실패했습니다.',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const validateBeforeCreate = () => {
    if (!canCreate) {
      throw new Error('이 스테이지는 최대 문제 수에 도달했습니다.');
    }
    if (!promptText.trim()) {
      throw new Error('문제 본문은 비어 있을 수 없습니다.');
    }
    if (!explanationText.trim()) {
      throw new Error('해설은 비어 있을 수 없습니다.');
    }

    if (questionType === 'SHORT_ANSWER') {
      const texts = shortAnswers.map((answer) => answer.answerText.trim());
      if (texts.length === 0 || texts.some((text) => !text)) {
        throw new Error('단답형 정답은 최소 1개 이상이며 비어 있을 수 없습니다.');
      }
      if (shortAnswerMode === 'MULTI_BLANK_ORDERED' && texts.length < 2) {
        throw new Error('멀티 빈칸 문제는 정답 칸이 최소 2개 이상 필요합니다.');
      }
      const unique = new Set(texts.map((text) => text.toLowerCase().replace(/\s+/g, '')));
      if (unique.size !== texts.length) {
        throw new Error('중복된 단답형 정답이 있습니다.');
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

  const resetForm = () => {
    setQuestionType('MULTIPLE_CHOICE');
    setShortAnswerMode('SINGLE');
    setPromptText('');
    setExplanationText('');
    setImageUrl('');
    setChoices([
      { choiceNo: 1, content: '', isAnswer: true },
      { choiceNo: 2, content: '', isAnswer: false },
    ]);
    setShortAnswers([{ answerText: '', isPrimary: true }]);
    if (createImageFileRef.current) {
      createImageFileRef.current.value = '';
    }
  };

  const buildCreatePayload = (): CSAdminQuestionDraft => {
    const resolvedImage = applyImageBlockToContentBlocks(null, imageUrl);
    const resolvedShortAnswerMode = resolveShortAnswerModeBySelection(shortAnswerMode);
    const base: CSAdminQuestionDraft = {
      questionType,
      prompt: promptText.trim(),
      explanation: explanationText.trim(),
      contentMode: resolvedImage.contentMode,
      contentBlocks: resolvedImage.contentBlocks,
      gradingMode: questionType === 'SHORT_ANSWER' ? resolvedShortAnswerMode.gradingMode : inferDefaultGradingMode(questionType),
      metadata: questionType === 'SHORT_ANSWER' ? resolvedShortAnswerMode.buildMetadata(shortAnswers.length) : null,
    };

    if (questionType === 'SHORT_ANSWER') {
      const normalized = shortAnswers.map((answer) => ({
        answerText: answer.answerText.trim(),
        isPrimary: Boolean(answer.isPrimary),
      }));
      if (!normalized.some((answer) => answer.isPrimary) && normalized.length > 0) {
        normalized[0].isPrimary = true;
      }
      return { ...base, shortAnswers: normalized };
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

  const handleCreate = async () => {
    try {
      validateBeforeCreate();
      const payload = buildCreatePayload();
      setSubmitting(true);
      await importAdminStageQuestions(stageId, {
        mode: 'UPSERT',
        questions: [payload],
      });
      toast({ title: '문제 추가 성공', description: '새 문제가 등록되었습니다.' });
      resetForm();
      onCreated();
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err?.message ?? '문제 추가에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">GUI 문제 추가</div>
          <span className="text-xs text-muted-foreground">
            {canCreate ? `추가 가능 ${remainingCount}개` : '최대 문제 수 도달'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
          <label className="text-xs text-muted-foreground">문제 유형</label>
          <select
            className="md:col-span-2 border rounded px-2 py-1 bg-background"
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as CSQuestionType)}
            disabled={submitting || !canCreate}
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
            disabled={submitting || !canCreate}
          />
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <label className="text-xs text-muted-foreground">해설</label>
          <Textarea
            value={explanationText}
            onChange={(e) => setExplanationText(e.target.value)}
            className="min-h-[56px]"
            disabled={submitting || !canCreate}
          />
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <label className="text-xs text-muted-foreground">문제 이미지 URL (선택)</label>
          <div className="flex items-center gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-sm"
              disabled={submitting || !canCreate || uploadingImage}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImageUploadClick}
              disabled={submitting || !canCreate || uploadingImage}
            >
              {uploadingImage ? '업로드 중...' : '파일 업로드'}
            </Button>
          </div>
          <input
            ref={createImageFileRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            onChange={handleImageFileChange}
          />
        </div>

        {questionType === 'SHORT_ANSWER' ? (
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <label className="text-xs text-muted-foreground">단답형 모드</label>
              <select
                className="md:col-span-2 border rounded px-2 py-1 bg-background"
                value={shortAnswerMode}
                onChange={(e) => setShortAnswerMode(e.target.value as ShortAnswerMode)}
                disabled={submitting || !canCreate}
              >
                <option value="SINGLE">단일 단답 (동의어 허용)</option>
                <option value="MULTI_BLANK_ORDERED">멀티 빈칸 (순서형)</option>
              </select>
            </div>

            <div className="font-semibold text-sm">
              {shortAnswerMode === 'MULTI_BLANK_ORDERED'
                ? '빈칸 정답 목록 (순서대로)'
                : '단답형 정답 (다중 허용)'}
            </div>
            {shortAnswers.map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={Boolean(ans.isPrimary)}
                  onChange={() => handleSetPrimaryShortAnswer(i)}
                  title="대표 정답"
                  disabled={submitting || !canCreate}
                />
                <Input
                  value={ans.answerText}
                  onChange={(e) => handleUpdateShortAnswerText(i, e.target.value)}
                  placeholder="정답"
                  className="h-8 text-sm"
                  disabled={submitting || !canCreate}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveShortAnswer(i)}
                  className="h-8 w-8 text-destructive"
                  disabled={submitting || !canCreate}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddShortAnswer}
              className="w-fit"
              disabled={submitting || !canCreate}
            >
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
                  disabled={submitting || !canCreate}
                />
                <span className="w-7 text-xs text-muted-foreground">{i + 1}.</span>
                <Input
                  value={choice.content}
                  onChange={(e) => handleUpdateChoiceContent(i, e.target.value)}
                  className="h-8 text-sm"
                  disabled={submitting || !canCreate}
                />
                {questionType === 'MULTIPLE_CHOICE' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChoice(i)}
                    className="h-8 w-8 text-destructive"
                    disabled={choices.length <= 2 || submitting || !canCreate}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {questionType === 'MULTIPLE_CHOICE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddChoice}
                className="w-fit"
                disabled={submitting || !canCreate}
              >
                <Plus className="h-4 w-4 mr-1" /> 선택지 추가
              </Button>
            )}
          </div>
        )}

        <div className="flex justify-end mt-1">
          <Button size="sm" onClick={handleCreate} disabled={submitting || !canCreate || uploadingImage}>
            <Plus className="h-4 w-4 mr-1" /> 문제 추가
          </Button>
        </div>
      </CardContent>
    </Card>
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
  const [shortAnswerMode, setShortAnswerMode] = useState<ShortAnswerMode>(inferShortAnswerModeFromQuestion(question));
  const [promptText, setPromptText] = useState(question.prompt);
  const [explanationText, setExplanationText] = useState(question.explanation ?? '');
  const [contentBlocks, setContentBlocks] = useState(question.contentBlocks ?? null);
  const [imageUrl, setImageUrl] = useState(extractImageUrlFromContentBlocks(question.contentBlocks ?? null));
  const [gradingMode, setGradingMode] = useState<CSQuestionGradingMode>(
    question.gradingMode ?? inferDefaultGradingMode(question.questionType),
  );
  const [metadataText, setMetadataText] = useState(question.metadata ?? null);
  const [choices, setChoices] = useState<CSAdminQuestionChoice[]>(toEditableChoices(question));
  const [shortAnswers, setShortAnswers] = useState<CSAdminQuestionShortAnswer[]>(
    toEditableShortAnswers(question),
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editImageFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuestionType(question.questionType);
    setShortAnswerMode(inferShortAnswerModeFromQuestion(question));
    setPromptText(question.prompt);
    setExplanationText(question.explanation ?? '');
    setContentBlocks(question.contentBlocks ?? null);
    setImageUrl(extractImageUrlFromContentBlocks(question.contentBlocks ?? null));
    setGradingMode(question.gradingMode ?? inferDefaultGradingMode(question.questionType));
    setMetadataText(question.metadata ?? null);
    setChoices(toEditableChoices(question));
    setShortAnswers(toEditableShortAnswers(question));
  }, [question]);

  const handleTypeChange = (nextType: CSQuestionType) => {
    setQuestionType(nextType);
    setGradingMode(inferDefaultGradingMode(nextType));
    if (nextType === 'SHORT_ANSWER') {
      setShortAnswerMode('SINGLE');
    }
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

  const handleImageUploadClick = () => {
    editImageFileRef.current?.click();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validateImageFile(file);
      setUploadingImage(true);
      const uploadedUrl = await uploadAdminQuestionImage(file);
      setImageUrl(uploadedUrl);
      toast({ title: '이미지 업로드 성공', description: '문제 이미지 URL이 자동 입력되었습니다.' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: err?.message ?? '이미지 업로드에 실패했습니다.',
      });
    } finally {
      setUploadingImage(false);
    }
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
      if (shortAnswerMode === 'MULTI_BLANK_ORDERED' && texts.length < 2) {
        throw new Error('멀티 빈칸 문제는 정답 칸이 최소 2개 이상 필요합니다.');
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
    const resolvedImage = applyImageBlockToContentBlocks(contentBlocks, imageUrl);
    const resolvedShortAnswerMode = resolveShortAnswerModeBySelection(shortAnswerMode);
    const base = {
      questionType,
      prompt: promptText.trim(),
      explanation: explanationText.trim(),
      contentMode: resolvedImage.contentMode,
      contentBlocks: resolvedImage.contentBlocks,
      gradingMode: questionType === 'SHORT_ANSWER' ? resolvedShortAnswerMode.gradingMode : gradingMode,
      metadata: questionType === 'SHORT_ANSWER'
        ? resolvedShortAnswerMode.buildMetadata(shortAnswers.length)
        : metadataText,
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
      setSaving(true);
      await updateAdminQuestion(stageId, question.questionId, payload);
      toast({ title: '문제 수정 성공' });
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err?.message ?? '문제 수정에 실패했습니다.' });
    } finally {
      setSaving(false);
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

            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-xs text-muted-foreground">문제 이미지 URL (선택)</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-sm"
                disabled={saving || uploadingImage}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImageUploadClick}
                disabled={saving || uploadingImage}
              >
                {uploadingImage ? '업로드 중...' : '파일 업로드'}
              </Button>
              <input
                ref={editImageFileRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                onChange={handleImageFileChange}
              />
            </div>

            {questionType === 'SHORT_ANSWER' ? (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <label className="text-xs text-muted-foreground">단답형 모드</label>
                  <select
                    className="md:col-span-2 border rounded px-2 py-1 bg-background"
                    value={shortAnswerMode}
                    onChange={(e) => setShortAnswerMode(e.target.value as ShortAnswerMode)}
                    disabled={saving || uploadingImage}
                  >
                    <option value="SINGLE">단일 단답 (동의어 허용)</option>
                    <option value="MULTI_BLANK_ORDERED">멀티 빈칸 (순서형)</option>
                  </select>
                </div>

                <div className="font-semibold text-sm">
                  {shortAnswerMode === 'MULTI_BLANK_ORDERED'
                    ? '빈칸 정답 목록 (순서대로)'
                    : '단답형 정답 (다중 허용)'}
                </div>
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
              <Button size="sm" onClick={handleSave} disabled={saving || uploadingImage}>
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
      contentMode: question.contentMode ?? 'LEGACY_TEXT',
      contentBlocks: question.contentBlocks ?? null,
      gradingMode: question.gradingMode ?? inferDefaultGradingMode(question.questionType),
      metadata: question.metadata ?? null,
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
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: true },
        { choiceNo: 2, content: 'X', isAnswer: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목2',
      explanation: '해설2',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
      choices: [
        { choiceNo: 1, content: '선택지2-1', isAnswer: true },
        { choiceNo: 2, content: '선택지2-2', isAnswer: false },
        { choiceNo: 3, content: '선택지2-3', isAnswer: false },
        { choiceNo: 4, content: '선택지2-4', isAnswer: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '애플리케이션 성능 지표 3가지를 순서대로 작성하시오.',
      explanation: '정답 순서: 처리량, 응답시간, 경과시간',
      contentMode: 'BLOCKS',
      contentBlocks:
        '[{"type":"TEXT","text":"표를 보고 (a),(b),(c)에 들어갈 용어를 순서대로 입력하세요."},{"type":"TABLE","headers":["지표","설명"],"rows":[["(a)","주어진 시간에 처리 가능한 트랜잭션 수"],["(b)","사용자 입력 후 응답 시작까지 걸린 시간"],["(c)","입력 시점부터 결과 출력 완료까지 걸린 시간"]]},{"type":"MULTI_BOX","boxes":[{"key":"a","label":"(a)"},{"key":"b","label":"(b)"},{"key":"c","label":"(c)"}]}]',
      gradingMode: 'MULTI_BLANK_ORDERED',
      metadata: '{"blankCount":3}',
      shortAnswers: [
        { answerText: '처리량', isPrimary: true },
        { answerText: '응답시간', isPrimary: false },
        { answerText: '경과시간', isPrimary: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목4',
      explanation: '해설4',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
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
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SHORT_TEXT_EXACT',
      metadata: null,
      shortAnswers: [
        { answerText: '정답5', isPrimary: true },
        { answerText: '정답5_보조', isPrimary: false },
      ],
    },
    {
      questionType: 'OX',
      prompt: '제목6',
      explanation: '해설6',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: false },
        { choiceNo: 2, content: 'X', isAnswer: true },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목7',
      explanation: '해설7',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
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
      contentMode: 'BLOCKS',
      contentBlocks:
        '[{"type":"TEXT","text":"절차를 순서대로 배열하시오."},{"type":"DIAGRAM","nodes":["요구사항 분석","개념 데이터 모델링","논리 데이터 모델링","물리 데이터 모델링"]}]',
      gradingMode: 'ORDERING',
      metadata: '{"itemCount":4}',
      shortAnswers: [
        { answerText: '정답8', isPrimary: true },
        { answerText: '정답8_보조', isPrimary: false },
      ],
    },
    {
      questionType: 'OX',
      prompt: '제목9',
      explanation: '해설9',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
      choices: [
        { choiceNo: 1, content: 'O', isAnswer: true },
        { choiceNo: 2, content: 'X', isAnswer: false },
      ],
    },
    {
      questionType: 'MULTIPLE_CHOICE',
      prompt: '제목10',
      explanation: '해설10',
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
      gradingMode: 'SINGLE_CHOICE',
      metadata: null,
      choices: [
        { choiceNo: 1, content: '선택지10-1', isAnswer: false },
        { choiceNo: 2, content: '선택지10-2', isAnswer: false },
        { choiceNo: 3, content: '선택지10-3', isAnswer: false },
        { choiceNo: 4, content: '선택지10-4', isAnswer: true },
      ],
    },
  ];
}

function buildNewTypeExampleDraft(): CSAdminQuestionDraft[] {
  return [
    {
      questionType: 'SHORT_ANSWER',
      prompt: '애플리케이션 성능 지표 3가지를 순서대로 작성하시오.',
      explanation: '정답 순서: 처리량, 응답시간, 경과시간',
      contentMode: 'BLOCKS',
      contentBlocks:
        '[{"type":"TEXT","text":"아래 표를 읽고 (a),(b),(c)의 용어를 순서대로 작성하세요."},{"type":"IMAGE","url":"https://example.com/sample.png","alt":"문제 이미지 예시"},{"type":"TABLE","headers":["지표","설명"],"rows":[["(a)","주어진 시간에 처리 가능한 트랜잭션 수"],["(b)","사용자 입력 후 응답 시작까지 걸린 시간"],["(c)","입력 시점부터 결과 출력 완료까지 걸린 시간"]]},{"type":"MULTI_BOX","boxes":[{"key":"a","label":"(a)"},{"key":"b","label":"(b)"},{"key":"c","label":"(c)"}]}]',
      gradingMode: 'MULTI_BLANK_ORDERED',
      metadata: '{"blankCount":3}',
      shortAnswers: [
        { answerText: '처리량', isPrimary: true },
        { answerText: '응답시간', isPrimary: false },
        { answerText: '경과시간', isPrimary: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '프로세스 상태 전이를 순서대로 작성하시오.',
      explanation: '준비-실행-대기-준비의 순환 흐름을 이해했는지 확인하는 문제입니다.',
      contentMode: 'BLOCKS',
      contentBlocks:
        '[{"type":"TEXT","text":"각 박스에 올바른 상태명을 입력하세요."},{"type":"MULTI_BOX","boxes":[{"key":"state1","label":"박스1"},{"key":"state2","label":"박스2"},{"key":"state3","label":"박스3"}]}]',
      gradingMode: 'ORDERING',
      metadata: '{"itemCount":3}',
      shortAnswers: [
        { answerText: '준비,실행,대기', isPrimary: true },
        { answerText: 'READY,RUNNING,WAITING', isPrimary: false },
      ],
    },
    {
      questionType: 'SHORT_ANSWER',
      prompt: '다음 Java 코드의 출력 결과를 작성하시오.',
      explanation: '상위 타입 참조로 호출되는 메서드 오버라이딩/오버로딩 동작을 구분하는 문제입니다.',
      contentMode: 'BLOCKS',
      contentBlocks:
        '[{"type":"TEXT","text":"코드를 읽고 콘솔 출력값을 정확히 작성하세요."},{"type":"CODE","language":"java","code":"abstract class Vehicle {\\n  private String name;\\n  abstract public String getName(String val);\\n  public String getName() {\\n    return \\"vehicle name:\\" + name;\\n  }\\n  public void setName(String val) {\\n    name = val;\\n  }\\n}\\n\\nclass Car extends Vehicle {\\n  public Car(String val) {\\n    setName(val);\\n  }\\n  public String getName(String val) {\\n    return \\"Car name : \\" + val;\\n  }\\n}\\n\\npublic class Good {\\n  public static void main(String[] args) {\\n    Vehicle obj = new Car(\\"Spark\\");\\n    System.out.print(obj.getName());\\n  }\\n}"}]',
      gradingMode: 'SHORT_TEXT_EXACT',
      metadata: null,
      shortAnswers: [
        { answerText: 'vehicle name:Spark', isPrimary: true },
      ],
    },
  ];
}

function validateJsonDraft(
  rawQuestions: unknown,
  config: { maxQuestionCount: number; exactQuestionCount: number | null },
) {
  if (!Array.isArray(rawQuestions)) {
    throw new Error('문제 배열(JSON Array) 형식이어야 합니다.');
  }

  if (rawQuestions.length === 0) {
    throw new Error('스테이지 문제는 최소 1개 이상이어야 합니다.');
  }

  if (config.exactQuestionCount !== null && rawQuestions.length !== config.exactQuestionCount) {
    throw new Error(`스테이지 문제는 정확히 ${config.exactQuestionCount}개여야 합니다.`);
  }

  if (rawQuestions.length > config.maxQuestionCount) {
    throw new Error(`스테이지 문제는 최대 ${config.maxQuestionCount}개까지 등록할 수 있습니다.`);
  }

  rawQuestions.forEach((rawQuestion, index) => {
    const position = index + 1;
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      throw new Error(`${position}번 문제 형식이 올바르지 않습니다.`);
    }

    const question = rawQuestion as CSAdminQuestionDraft;
    validateQuestionType(question.questionType, position);
    validateQuestionModeFields(question, position);

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

function validateQuestionModeFields(question: CSAdminQuestionDraft, position: number) {
  if (
    question.contentMode !== undefined &&
    !['LEGACY_TEXT', 'BLOCKS'].includes(question.contentMode)
  ) {
    throw new Error(`${position}번 문제의 contentMode가 올바르지 않습니다.`);
  }

  if (
    question.gradingMode !== undefined &&
    ![
      'DEFAULT_BY_TYPE',
      'SINGLE_CHOICE',
      'SHORT_TEXT_EXACT',
      'MULTI_BLANK_ORDERED',
      'ORDERING',
    ].includes(question.gradingMode)
  ) {
    throw new Error(`${position}번 문제의 gradingMode가 올바르지 않습니다.`);
  }

  if (question.contentMode === 'BLOCKS') {
    const contentBlocks = question.contentBlocks?.trim();
    if (!contentBlocks) {
      throw new Error(`${position}번 문제는 BLOCKS 모드에서 contentBlocks가 필요합니다.`);
    }
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

function validateImageFile(file: File) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('jpg, jpeg, png, webp, gif 형식만 업로드할 수 있습니다.');
  }

  const maxFileSize = 10 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('이미지 용량은 10MB 이하만 가능합니다.');
  }
}

function parseContentBlocks(raw: string | null | undefined): any[] | null {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractImageUrlFromContentBlocks(raw: string | null | undefined): string {
  const blocks = parseContentBlocks(raw);
  if (!blocks || blocks.length === 0) return '';

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const type = String((block as { type?: unknown }).type ?? '').toUpperCase();
    if (type === 'IMAGE') {
      const url = (block as { url?: unknown; src?: unknown }).url ?? (block as { src?: unknown }).src;
      return typeof url === 'string' ? url : '';
    }
  }
  return '';
}

function applyImageBlockToContentBlocks(
  raw: string | null | undefined,
  imageUrl: string,
): { contentMode: CSQuestionContentMode; contentBlocks: string | null } {
  const trimmedImageUrl = imageUrl.trim();
  const blocks = parseContentBlocks(raw);

  if (blocks === null) {
    if (!trimmedImageUrl) {
      const normalizedRaw = raw?.trim() || null;
      return {
        contentMode: normalizedRaw ? 'BLOCKS' : 'LEGACY_TEXT',
        contentBlocks: normalizedRaw,
      };
    }
    return {
      contentMode: 'BLOCKS',
      contentBlocks: JSON.stringify([{ type: 'IMAGE', url: trimmedImageUrl, alt: '문제 이미지' }]),
    };
  }

  const nextBlocks = blocks.filter((block) => {
    if (!block || typeof block !== 'object') return true;
    const type = String((block as { type?: unknown }).type ?? '').toUpperCase();
    return type !== 'IMAGE';
  });

  if (trimmedImageUrl) {
    nextBlocks.push({
      type: 'IMAGE',
      url: trimmedImageUrl,
      alt: '문제 이미지',
    });
  }

  if (nextBlocks.length === 0) {
    return {
      contentMode: 'LEGACY_TEXT',
      contentBlocks: null,
    };
  }

  return {
    contentMode: 'BLOCKS',
    contentBlocks: JSON.stringify(nextBlocks),
  };
}

function inferShortAnswerModeFromQuestion(question: Pick<CSAdminQuestion, 'gradingMode' | 'metadata'>): ShortAnswerMode {
  const gradingMode = question.gradingMode;
  if (gradingMode === 'MULTI_BLANK_ORDERED' || gradingMode === 'ORDERING') {
    return 'MULTI_BLANK_ORDERED';
  }

  const metadata = question.metadata?.trim();
  if (metadata) {
    try {
      const parsed = JSON.parse(metadata) as Record<string, unknown>;
      const blankCount = parsed.blankCount;
      if (typeof blankCount === 'number' && blankCount > 1) {
        return 'MULTI_BLANK_ORDERED';
      }
      if (typeof blankCount === 'string') {
        const parsedCount = Number.parseInt(blankCount, 10);
        if (!Number.isNaN(parsedCount) && parsedCount > 1) {
          return 'MULTI_BLANK_ORDERED';
        }
      }
    } catch {
      // noop
    }
  }

  return 'SINGLE';
}

function resolveShortAnswerModeBySelection(mode: ShortAnswerMode): {
  gradingMode: CSQuestionGradingMode;
  buildMetadata: (answerCount: number) => string | null;
} {
  if (mode === 'MULTI_BLANK_ORDERED') {
    return {
      gradingMode: 'MULTI_BLANK_ORDERED',
      buildMetadata: (answerCount: number) => JSON.stringify({ blankCount: Math.max(answerCount, 1) }),
    };
  }

  return {
    gradingMode: 'SHORT_TEXT_EXACT',
    buildMetadata: () => null,
  };
}

function inferDefaultGradingMode(questionType: CSQuestionType): CSQuestionGradingMode {
  if (questionType === 'SHORT_ANSWER') {
    return 'SHORT_TEXT_EXACT';
  }
  return 'SINGLE_CHOICE';
}
