import { cookies } from 'next/headers';
import { SubmissionHistory } from '../types';

// 필터링 옵션 인터페이스
export interface HistoryFilter {
  startDate?: string;
  endDate?: string;
  tier?: string;
  sourceType?: string;
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSubmissionHistory(
  _nickname: string,
  _filter?: HistoryFilter,
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

    const url =
      _nickname && _nickname !== 'me'
        ? `${backendUrl}/api/users/${_nickname}/history?page=0&size=20`
        : `${backendUrl}/api/users/me/history?page=0&size=20`;

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
        ? new Date(item.submittedAt).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Seoul',
        }).replace(/\. /g, '.').replace(/\.$/, '').replace(', ', ' ')
        : '';

      return {
        id: String(item.submissionId),
        problemId: Number(item.problemId), // BOJ ID
        problemTitle: item.problemTitle || 'Unknown Problem',
        tier: item.tier || 'Unranked',
        language: item.language || 'Unknown',
        memory: `${item.memory || 0}KB`,
        time: `${item.executionTime || 0}ms`,
        isSuccess: item.result?.includes('맞았습니다') ?? false, // result로부터 계산
        timestamp: formattedDate,
        sourceType,
        sourceDetail: item.sourceDetail,
        code: item.code,
      };
    });
  } catch (e) {
    console.error('Error fetching submission history:', e);
    return [];
  }
}
