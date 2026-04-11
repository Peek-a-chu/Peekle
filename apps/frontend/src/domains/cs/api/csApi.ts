import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types/apiUtils';

export interface CSDomain {
  id: number;
  name: string;
}

export type CSQuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' | 'OX';

export interface CSProgress {
  currentTrackNo: number;
  currentTrackName: string;
  currentStageNo: number;
}

export interface CSBootstrapResponse {
  needsDomainSelection: boolean;
  currentDomain: CSDomain | null;
  progress: CSProgress | null;
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
  choices?: CSQuestionChoice[];
}

export interface CSAttemptStartResponse {
  stageId: number;
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
  isCorrect: boolean;
  feedback: string;
  isLast: boolean;
  score?: number;
  nextQuestion?: CSQuestionPayload;
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
  nextStageId: number | null;
}

export type CSWrongProblemStatus = 'ACTIVE' | 'CLEARED';

export interface CSWrongProblemItem {
  questionId: number;
  lastWrongAt: string;
}

export interface CSWrongProblemsResponse {
  content: CSWrongProblemItem[];
  page: number;
  size: number;
  totalElements: number;
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
 * 오답노트 조회
 */
export const fetchCSWrongProblems = async (
  domainId: number,
  status: CSWrongProblemStatus,
  page = 0,
  size = 20,
): Promise<CSWrongProblemsResponse> => {
  const query = new URLSearchParams({
    domainId: String(domainId),
    status,
    page: String(page),
    size: String(size),
  });

  const response = await apiFetch<CSWrongProblemsResponse>(`/api/cs/wrong-problems?${query.toString()}`);
  return assertApiData(response, '오답노트를 불러오지 못했습니다.');
};
