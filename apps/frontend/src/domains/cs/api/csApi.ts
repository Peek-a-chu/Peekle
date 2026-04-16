import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types/apiUtils';

export interface CSDomain {
  id: number;
  name: string;
}

export type CSQuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' | 'OX';
export type CSQuestionContentMode = 'LEGACY_TEXT' | 'BLOCKS';
export type CSQuestionGradingMode =
  | 'DEFAULT_BY_TYPE'
  | 'SINGLE_CHOICE'
  | 'SHORT_TEXT_EXACT'
  | 'MULTI_BLANK_ORDERED'
  | 'MULTI_BLANK_UNORDERED'
  | 'ORDERING';
export type CSAttemptPhase = 'FIRST_PASS' | 'RETRY_WRONG' | 'COMPLETED';

export interface CSProgress {
  currentTrackNo: number;
  currentTrackName: string;
  currentStageNo: number;
}

export type CSStageStatus = 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED';

export interface CSStageStatusItem {
  stageId: number;
  stageNo: number;
  trackNo?: number;
  trackName?: string;
  status: CSStageStatus;
  lockReason: string | null;
}

export interface CSBootstrapResponse {
  needsDomainSelection: boolean;
  currentDomain: CSDomain | null;
  progress: CSProgress | null;
  stages: CSStageStatusItem[];
}

export interface CSMyDomainItem {
  domain: CSDomain;
  progress: CSProgress;
  isCurrent: boolean;
}

export interface CSDomainSubmitResponse {
  added: boolean;
  domain: CSDomain;
  progress: CSProgress;
  isCurrent: boolean;
}

export interface CSCurrentDomainChangeResponse {
  currentDomain: CSDomain;
  progress: CSProgress;
}

export interface CSQuestionChoice {
  choiceNo: number;
  content: string;
}

export interface CSQuestionPayload {
  questionId: number;
  questionType: CSQuestionType;
  prompt: string;
  contentMode?: CSQuestionContentMode;
  contentBlocks?: string | null;
  gradingMode?: CSQuestionGradingMode;
  metadata?: string | null;
  choices?: CSQuestionChoice[];
}

export interface CSAttemptStartResponse {
  stageId: number;
  totalQuestionCount: number;
  firstQuestion: CSQuestionPayload;
}

export interface CSAttemptAnswerRequest {
  questionId: number;
  selectedChoiceNo?: number;
  answerText?: string;
}

export interface CSAttemptProgress {
  currentQuestionNo: number;
  totalQuestionCount: number;
}

export interface CSAttemptAnswerResponse {
  questionId: number;
  questionType: CSQuestionType;
  progress: CSAttemptProgress;
  phase: CSAttemptPhase;
  isCorrect: boolean;
  feedback: string;
  correctChoiceNo?: number;
  correctAnswer?: string;
  isLast: boolean;
  score?: number;
  nextQuestion?: CSQuestionPayload;
}

export type CSQuestionClaimType =
  | 'INCORRECT_ANSWER'
  | 'INCORRECT_EXPLANATION'
  | 'QUESTION_TEXT_ERROR'
  | 'OTHER';

export interface CSQuestionClaimRequest {
  questionId: number;
  claimType: CSQuestionClaimType;
  description: string;
  isCorrect: boolean;
  selectedChoiceNo?: number;
  submittedAnswer?: string;
}

export interface CSQuestionClaimResponse {
  claimId: number;
  questionId: number;
  claimType: CSQuestionClaimType;
  status: 'RECEIVED' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
}

export interface CSAttemptCompleteResponse {
  stageId: number;
  isTrackCompleted: boolean;
  correctRate: number;
  correctCount: number;
  wrongCount: number;
  messageCode: string;
  streakEarnedToday: boolean;
  currentStreak: number;
  earnedScore: number;
  totalScore: number;
  nextStageId: number | null;
  maxSolve?: number | null;
}

export interface CSTrackSkipResponse {
  skippedTrackNo: number;
  nextTrackNo: number | null;
  nextStageNo: number | null;
  nextStageId: number | null;
  isCurriculumCompleted: boolean;
}

export type CSWrongProblemStatus = 'ACTIVE' | 'CLEARED';

export interface CSWrongProblemItem {
  questionId: number;
  questionType: CSQuestionType;
  prompt: string;
  correctAnswer?: string;
  domainId: number;
  domainName: string;
  trackNo: number;
  stageId: number;
  stageNo: number;
  status: CSWrongProblemStatus;
  lastWrongAt: string;
  clearedAt?: string;
}

export interface CSWrongProblemsResponse {
  content: CSWrongProblemItem[];
  page: number;
  size: number;
  totalElements: number;
}

export interface CSPastExamRound {
  roundNo: number;
  stageId: number | null;
  questionCount: number;
  isReady: boolean;
  maxSolve?: number | null;
}

export interface CSPastExamYear {
  year: number;
  rounds: CSPastExamRound[];
}

export interface CSPastExamCatalogResponse {
  years: CSPastExamYear[];
}

export interface CSWrongReviewStartRequest {
  domainId?: number;
  stageId?: number;
  questionCount?: number;
}

export interface CSWrongReviewStartResponse {
  reviewId: string | null;
  totalQuestionCount: number;
  firstQuestion: CSQuestionPayload | null;
}

export interface CSWrongReviewAnswerResponse {
  reviewId: string;
  questionId: number;
  questionType: CSQuestionType;
  progress: CSAttemptProgress;
  isCorrect: boolean;
  feedback: string;
  correctChoiceNo?: number;
  correctAnswer?: string;
  isLast: boolean;
  nextQuestion?: CSQuestionPayload;
}

export interface CSWrongReviewCompleteResponse {
  reviewId: string;
  totalQuestionCount: number;
  correctRate: number;
  correctCount: number;
  wrongCount: number;
  messageCode: string;
  clearedCount: number;
  remainedActiveCount: number;
}

function assertApiData<T>(response: ApiResponse<T>, defaultMessage: string): T {
  if (!response.success || response.data === null) {
    throw new Error(response.error?.message || defaultMessage);
  }
  return response.data;
}

/**
 * CS 탭 초기 진입 시 사용자 상태 조회 (마지막 도메인 및 진행 위치 조회)
 */
export const fetchCSBootstrap = async (): Promise<CSBootstrapResponse> => {
  const response = await apiFetch<CSBootstrapResponse>('/api/cs/bootstrap');
  return assertApiData(response, 'CS 부트스트랩 정보를 불러오지 못했습니다.');
};

/**
 * 전체 CS 도메인 목록 조회 (현재 학습 중 제외 등 로직)
 */
export const fetchCSDomains = async (): Promise<CSDomain[]> => {
  const response = await apiFetch<CSDomain[]>('/api/cs/domains');
  return assertApiData(response, 'CS 도메인 목록을 불러오지 못했습니다.');
};

/**
 * 내 공부 도메인 목록 조회
 */
export const fetchMyCSDomains = async (): Promise<CSMyDomainItem[]> => {
  const response = await apiFetch<CSMyDomainItem[]>('/api/cs/me/domains');
  return assertApiData(response, '내 CS 도메인 목록을 불러오지 못했습니다.');
};

/**
 * 사용자가 선택한 CS 도메인 등록
 */
export const addCSDomain = async (domainId: number): Promise<CSDomainSubmitResponse> => {
  console.log(`[DEBUG] POST /api/cs/me/domains with domainId: ${domainId}`); // 디버깅 요구사항에 따른 로그
  const response = await apiFetch<CSDomainSubmitResponse>('/api/cs/me/domains', {
    method: 'POST',
    body: JSON.stringify({ domainId }),
  });
  return assertApiData(response, 'CS 도메인 추가에 실패했습니다.');
};

/**
 * 이전 함수명 호환용 alias
 */
export const changeCSDomain = addCSDomain;

/**
 * 현재 보는 도메인 변경
 */
export const changeCurrentCSDomain = async (
  domainId: number,
): Promise<CSCurrentDomainChangeResponse> => {
  const response = await apiFetch<CSCurrentDomainChangeResponse>('/api/cs/me/current-domain', {
    method: 'PUT',
    body: JSON.stringify({ domainId }),
  });
  return assertApiData(response, '현재 CS 도메인 변경에 실패했습니다.');
};

/**
 * 스테이지 시작
 */
export const startCSStageAttempt = async (stageId: number): Promise<CSAttemptStartResponse> => {
  const response = await apiFetch<CSAttemptStartResponse>(`/api/cs/stages/${stageId}/attempt/start`, {
    method: 'POST',
  });
  return assertApiData(response, '스테이지 시작에 실패했습니다.');
};

/**
 * 문제 제출/채점
 */
export const answerCSStageQuestion = async (
  stageId: number,
  payload: CSAttemptAnswerRequest,
): Promise<CSAttemptAnswerResponse> => {
  const response = await apiFetch<CSAttemptAnswerResponse>(
    `/api/cs/stages/${stageId}/attempt/answer`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return assertApiData(response, '문제 채점에 실패했습니다.');
};

/**
 * 스테이지 완료/결과 조회
 */
export const completeCSStageAttempt = async (
  stageId: number,
): Promise<CSAttemptCompleteResponse> => {
  const response = await apiFetch<CSAttemptCompleteResponse>(
    `/api/cs/stages/${stageId}/attempt/complete`,
    {
      method: 'POST',
    },
  );
  return assertApiData(response, '스테이지 결과 조회에 실패했습니다.');
};

/**
 * 문제/정답/해설 신고
 */
export const submitCSQuestionClaim = async (
  stageId: number,
  payload: CSQuestionClaimRequest,
): Promise<CSQuestionClaimResponse> => {
  const response = await apiFetch<CSQuestionClaimResponse>(`/api/cs/stages/${stageId}/claims`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return assertApiData(response, '문제 신고 접수에 실패했습니다.');
};

/**
 * 현재 트랙 스킵
 */
export const skipCurrentCSTrack = async (): Promise<CSTrackSkipResponse> => {
  const response = await apiFetch<CSTrackSkipResponse>(
    '/api/cs/tracks/current/skip',
    {
      method: 'POST',
    },
  );
  return assertApiData(response, '현재 트랙 스킵에 실패했습니다.');
};

/**
 * 정보처리기사 기출 카탈로그 조회
 */
export const fetchCSPastExamCatalog = async (): Promise<CSPastExamCatalogResponse> => {
  const response = await apiFetch<CSPastExamCatalogResponse>('/api/cs/past-exams');
  return assertApiData(response, '기출 카탈로그를 불러오지 못했습니다.');
};

/**
 * 오답노트 조회
 */
export const fetchCSWrongProblems = async (
  domainId: number | null,
  status: CSWrongProblemStatus,
  stageId: number | null = null,
  page = 0,
  size = 20,
): Promise<CSWrongProblemsResponse> => {
  const query = new URLSearchParams();
  if (domainId !== null) query.set('domainId', String(domainId));
  if (stageId !== null) query.set('stageId', String(stageId));
  query.set('status', status);
  query.set('page', String(page));
  query.set('size', String(size));

  const response = await apiFetch<CSWrongProblemsResponse>(`/api/cs/wrong-problems?${query.toString()}`);
  return assertApiData(response, '오답노트를 불러오지 못했습니다.');
};

/**
 * 오답 복습 세션 시작
 */
export const startCSWrongReview = async (
  payload: CSWrongReviewStartRequest,
): Promise<CSWrongReviewStartResponse> => {
  const response = await apiFetch<CSWrongReviewStartResponse>('/api/cs/wrong-problems/review/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return assertApiData(response, '오답 복습 세션을 시작하지 못했습니다.');
};

/**
 * 오답 복습 문제 제출/채점
 */
export const answerCSWrongReviewQuestion = async (
  reviewId: string,
  payload: CSAttemptAnswerRequest,
): Promise<CSWrongReviewAnswerResponse> => {
  const response = await apiFetch<CSWrongReviewAnswerResponse>(
    `/api/cs/wrong-problems/review/${reviewId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return assertApiData(response, '오답 복습 문제 채점에 실패했습니다.');
};

/**
 * 오답 복습 완료/결과 조회
 */
export const completeCSWrongReview = async (
  reviewId: string,
): Promise<CSWrongReviewCompleteResponse> => {
  const response = await apiFetch<CSWrongReviewCompleteResponse>(
    `/api/cs/wrong-problems/review/${reviewId}/complete`,
    {
      method: 'POST',
    },
  );
  return assertApiData(response, '오답 복습 결과 조회에 실패했습니다.');
};
