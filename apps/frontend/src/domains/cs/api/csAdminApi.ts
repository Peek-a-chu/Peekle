import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types/apiUtils';
import {
  CSDomain,
  CSQuestionType,
  CSQuestionContentMode,
  CSQuestionGradingMode,
} from './csApi';

export type CSTrackLearningMode = 'CURRICULUM' | 'PAST_EXAM';

export interface CSAdminTrack {
  trackId: number;
  domainId: number;
  domainName: string;
  trackNo: number;
  name: string;
  learningMode: CSTrackLearningMode;
  examYear: number | null;
  stages: CSAdminStageSummary[];
}

export interface CSAdminStageSummary {
  stageId: number;
  stageNo: number;
}

export interface CSAdminQuestionChoice {
  choiceNo: number;
  content: string;
  isAnswer: boolean;
}

export interface CSAdminQuestionShortAnswer {
  answerText: string;
  blankIndex?: number;
  isPrimary: boolean;
}

export interface CSAdminQuestion {
  questionId: number;
  questionType: CSQuestionType;
  prompt: string;
  explanation: string | null;
  contentMode?: CSQuestionContentMode;
  contentBlocks?: string | null;
  gradingMode?: CSQuestionGradingMode;
  metadata?: string | null;
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
  contentMode?: CSQuestionContentMode;
  contentBlocks?: string | null;
  gradingMode?: CSQuestionGradingMode;
  metadata?: string | null;
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

export interface CSAdminImagePresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
}

export interface CSAdminClaimItem {
  claimId: string;
  questionId: number;
  reason: string;
  status: 'RECEIVED' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
}

export interface CSAdminStageClaimsResponse {
  stageId: number;
  totalClaims: number;
  message: string;
  items: CSAdminClaimItem[];
}

export type CSAdminClaimStatus = 'RECEIVED' | 'REVIEWED' | 'RESOLVED';
export type CSAdminClaimType = 'INCORRECT_ANSWER' | 'INCORRECT_EXPLANATION' | 'QUESTION_TEXT_ERROR' | 'OTHER';

export interface CSAdminClaimOverviewItem {
  claimId: number;
  questionId: number;
  domainId: number;
  domainName: string;
  trackId: number;
  trackNo: number;
  trackName: string;
  stageId: number;
  stageNo: number;
  claimType: CSAdminClaimType;
  status: CSAdminClaimStatus;
  description: string;
  createdAt: string;
}

export interface CSAdminClaimOverviewPageResponse {
  content: CSAdminClaimOverviewItem[];
  page: number;
  size: number;
  totalElements: number;
}

export interface CSAdminClaimOverviewQuery {
  status?: CSAdminClaimStatus;
  claimType?: CSAdminClaimType;
  domainId?: number;
  trackId?: number;
  stageId?: number;
  questionId?: number;
  page?: number;
  size?: number;
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

export const createAdminTrack = async (
  domainId: number,
  name: string,
  stageCount?: number,
  learningMode?: CSTrackLearningMode,
  examYear?: number | null
): Promise<CSAdminTrack> => {
  const response = await apiFetch<CSAdminTrack>(`/api/cs/admin/domains/${domainId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ name, stageCount, learningMode, examYear }),
  });
  return assertApiData(response, '트랙 생성에 실패했습니다.');
};

export const renameAdminTrack = async (
  trackId: number,
  name: string,
  learningMode?: CSTrackLearningMode,
  examYear?: number | null,
): Promise<CSAdminTrack> => {
  const response = await apiFetch<CSAdminTrack>(`/api/cs/admin/tracks/${trackId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, learningMode, examYear }),
  });
  return assertApiData(response, '트랙 이름 변경에 실패했습니다.');
};

export const deleteAdminTrack = async (trackId: number): Promise<void> => {
  const response = await apiFetch<void>(`/api/cs/admin/tracks/${trackId}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || '트랙 삭제에 실패했습니다.');
  }
};

export const deleteAdminStage = async (stageId: number): Promise<void> => {
  const response = await apiFetch<void>(`/api/cs/admin/stages/${stageId}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || '스테이지 삭제에 실패했습니다.');
  }
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

export const fetchAdminStageClaims = async (stageId: number): Promise<CSAdminStageClaimsResponse> => {
  const response = await apiFetch<CSAdminStageClaimsResponse>(`/api/cs/admin/stages/${stageId}/claims`);
  return assertApiData(response, '클레임 목록을 불러오지 못했습니다.');
};

export const fetchAdminClaimsOverview = async (
  query: CSAdminClaimOverviewQuery = {},
): Promise<CSAdminClaimOverviewPageResponse> => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.claimType) params.set('claimType', query.claimType);
  if (typeof query.domainId === 'number') params.set('domainId', String(query.domainId));
  if (typeof query.trackId === 'number') params.set('trackId', String(query.trackId));
  if (typeof query.stageId === 'number') params.set('stageId', String(query.stageId));
  if (typeof query.questionId === 'number') params.set('questionId', String(query.questionId));
  if (typeof query.page === 'number') params.set('page', String(query.page));
  if (typeof query.size === 'number') params.set('size', String(query.size));

  const queryString = params.toString();
  const response = await apiFetch<CSAdminClaimOverviewPageResponse>(
    `/api/cs/admin/claims${queryString ? `?${queryString}` : ''}`,
  );
  return assertApiData(response, '통합 신고 목록을 불러오지 못했습니다.');
};

export const updateAdminClaimStatus = async (
  claimId: number,
  status: CSAdminClaimStatus,
): Promise<void> => {
  const response = await apiFetch<void>(`/api/cs/admin/claims/${claimId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || '신고 상태 변경에 실패했습니다.');
  }
};

export const getAdminQuestionImagePresignedUrl = async (
  fileName: string,
  contentType: string,
): Promise<CSAdminImagePresignedUrlResponse> => {
  const response = await apiFetch<CSAdminImagePresignedUrlResponse>('/api/cs/admin/images/presigned-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  });
  return assertApiData(response, '이미지 업로드 URL 발급에 실패했습니다.');
};

export const uploadAdminQuestionImage = async (file: File): Promise<string> => {
  const { presignedUrl, publicUrl } = await getAdminQuestionImagePresignedUrl(file.name, file.type);

  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('R2 이미지 업로드에 실패했습니다.');
  }

  return publicUrl;
};
