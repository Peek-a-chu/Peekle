import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types/apiUtils';
import { CSDomain, CSQuestionType } from './csApi';

export interface CSAdminTrack {
  trackId: number;
  domainId: number;
  trackNo: number;
  name: string;
  stageIds: number[];
}

export interface CSAdminQuestionChoice {
  choiceNo: number;
  content: string;
  isAnswer: boolean;
}

export interface CSAdminQuestionShortAnswer {
  answerText: string;
  isPrimary: boolean;
}

export interface CSAdminQuestion {
  questionId: number;
  questionType: CSQuestionType;
  prompt: string;
  explanation: string | null;
  choices: CSAdminQuestionChoice[];
  shortAnswers: CSAdminQuestionShortAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface CSAdminQuestionDraft {
  questionId?: number;
  questionType: CSQuestionType;
  prompt: string;
  explanation: string;
  choices?: CSAdminQuestionChoice[];
  shortAnswers?: CSAdminQuestionShortAnswer[];
}

export interface CSAdminStageQuestionImportRequest {
  mode: 'REPLACE' | 'UPSERT';
  questions: CSAdminQuestionDraft[];
}

export interface CSAdminQuestionShortAnswersUpdateRequest {
  shortAnswers: CSAdminQuestionShortAnswer[];
}

function assertApiData<T>(response: ApiResponse<T>, defaultMessage: string): T {
  if (!response.success || response.data === null || response.data === undefined) {
    throw new Error(response.error?.message || defaultMessage);
  }
  return response.data;
}

/** Domain Management */
export const fetchAdminDomains = async (): Promise<CSDomain[]> => {
  const response = await apiFetch<CSDomain[]>('/api/cs/admin/domains');
  return assertApiData(response, '도메인 목록을 불러오지 못했습니다.');
};

export const createAdminDomain = async (name: string): Promise<CSDomain> => {
  const response = await apiFetch<CSDomain>('/api/cs/admin/domains', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return assertApiData(response, '도메인 생성에 실패했습니다.');
};

export const renameAdminDomain = async (domainId: number, name: string): Promise<CSDomain> => {
  const response = await apiFetch<CSDomain>(`/api/cs/admin/domains/${domainId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return assertApiData(response, '도메인 이름 변경에 실패했습니다.');
};

export const deleteAdminDomain = async (domainId: number): Promise<void> => {
  const response = await apiFetch<void>(`/api/cs/admin/domains/${domainId}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || '도메인 삭제에 실패했습니다.');
  }
};

/** Track Management */
export const fetchAdminTracks = async (domainId: number): Promise<CSAdminTrack[]> => {
  const response = await apiFetch<CSAdminTrack[]>(`/api/cs/admin/domains/${domainId}/tracks`);
  return assertApiData(response, '트랙 목록을 불러오지 못했습니다.');
};

export const createAdminTrack = async (domainId: number, name: string): Promise<CSAdminTrack> => {
  const response = await apiFetch<CSAdminTrack>(`/api/cs/admin/domains/${domainId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return assertApiData(response, '트랙 생성에 실패했습니다.');
};

export const renameAdminTrack = async (trackId: number, name: string): Promise<CSAdminTrack> => {
  const response = await apiFetch<CSAdminTrack>(`/api/cs/admin/tracks/${trackId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return assertApiData(response, '트랙 이름 변경에 실패했습니다.');
};

/** Stage/Question Management */
export const fetchAdminStageQuestions = async (stageId: number): Promise<CSAdminQuestion[]> => {
  const response = await apiFetch<CSAdminQuestion[]>(`/api/cs/admin/stages/${stageId}/questions`);
  return assertApiData(response, '스테이지 문제 목록을 불러오지 못했습니다.');
};

export const importAdminStageQuestions = async (stageId: number, payload: CSAdminStageQuestionImportRequest): Promise<any> => {
  const response = await apiFetch<any>(`/api/cs/admin/stages/${stageId}/questions/import`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return assertApiData(response, '문제 가져오기에 실패했습니다.');
};

export const updateAdminQuestion = async (stageId: number, questionId: number, payload: CSAdminQuestionDraft): Promise<CSAdminQuestion> => {
  const response = await apiFetch<CSAdminQuestion>(`/api/cs/admin/stages/${stageId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return assertApiData(response, '문제 수정에 실패했습니다.');
};

export const updateAdminQuestionShortAnswers = async (questionId: number, payload: CSAdminQuestionShortAnswersUpdateRequest): Promise<CSAdminQuestion> => {
  const response = await apiFetch<CSAdminQuestion>(`/api/cs/admin/questions/${questionId}/short-answers`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return assertApiData(response, '단답형 정답 수정에 실패했습니다.');
};

export const fetchAdminStageClaims = async (stageId: number): Promise<any> => {
  const response = await apiFetch<any>(`/api/cs/admin/stages/${stageId}/claims`);
  return assertApiData(response, '클레임 목록을 불러오지 못했습니다.');
};
