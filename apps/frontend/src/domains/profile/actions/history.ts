import { cookies } from 'next/headers';
import { SubmissionHistory } from '../types';

export interface FetchHistoryParams {
  tier?: string;
  date?: string;
  sourceType?: string;
  status?: string;
  page?: number;
  size?: number;
}

interface SubmissionLogResponse {
  submissionId: number;
  userId: number;
  nickname: string;
  profileImage: string;
  memory: number;
  executionTime: number;
  language: string;
  submittedAt: string;
  problemId: string;
  problemTitle: string;
  tier: string;
  sourceType: string;
  sourceDetail: string;
  code: string;
  result: string; // 제출 결과
  isSuccess: boolean; // 성공 여부
}

export async function fetchUserHistory(
  nickname: string,
  { tier, date, sourceType, status, page = 0, size = 20 }: FetchHistoryParams,
): Promise<SubmissionHistory[]> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Cookie'] = `access_token=${accessToken}`;
    }

    // URL Construction
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (size !== undefined) params.append('size', size.toString());
    if (tier && tier !== '전체') params.append('tier', tier);
    if (date) params.append('date', date);
    if (sourceType && sourceType !== 'ALL') params.append('sourceType', sourceType);
    if (status && status !== 'ALL') params.append('status', status);

    const endpoint =
      nickname && nickname !== 'me' ? `/api/users/${nickname}/history` : `/api/users/me/history`;

    const url = `${backendUrl}${endpoint}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch history: ${res.status}`);
      return [];
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      return [];
    }

    const logs: SubmissionLogResponse[] = json.data.content || [];

    return logs.map((item) => {
      // sourceType Mapping
      let sourceType: 'SOLO' | 'STUDY' | 'GAME' = 'SOLO';
      if (item.sourceType === 'STUDY') sourceType = 'STUDY';
      else if (item.sourceType === 'GAME') sourceType = 'GAME';
      else if (item.sourceType === 'EXTENSION') sourceType = 'SOLO';

      // Timestamp formatting - Convert to KST (UTC+9)
      const formattedDate = item.submittedAt
        ? new Date(item.submittedAt)
            .toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Seoul',
            })
            .replace(/\. /g, '.')
            .replace(/\.$/, '')
            .replace(', ', ' ')
        : '';

      return {
        id: String(item.submissionId),
        problemId: Number(item.problemId), // BOJ ID
        problemTitle: item.problemTitle || 'Unknown Problem',
        tier: item.tier || 'Unranked',
        language: item.language || 'Unknown',
        memory: `${item.memory || 0}KB`,
        time: `${item.executionTime || 0}ms`,
        isSuccess: item.isSuccess ?? false, // Backend value used directly
        result: item.result, // Raw Result Mapping
        timestamp: formattedDate,
        sourceType,
        sourceDetail: item.sourceDetail,
        code: item.code,
      };
    }); // End map
  } catch (e) {
    console.error('Error fetching submission history:', e);
    return [];
  }
}
