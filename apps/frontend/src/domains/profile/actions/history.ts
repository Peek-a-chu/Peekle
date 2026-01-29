import { SubmissionHistory } from '../types';

export const MOCK_HISTORY: SubmissionHistory[] = [
  {
    id: '1',
    problemId: 1000,
    problemTitle: 'A+B',
    tier: 'Bronze V',
    language: 'Python',
    memory: '31120KB',
    time: '40ms',
    isSuccess: true,
    timestamp: '2026.01.16 10:30',
    sourceType: 'SOLO',
  },
  {
    id: '2',
    problemId: 2557,
    problemTitle: 'Hello World',
    tier: 'Bronze V',
    language: 'C++',
    memory: '2020KB',
    time: '0ms',
    isSuccess: true,
    timestamp: '2026.01.16 11:00',
    sourceType: 'STUDY',
    sourceDetail: '알고리즘 스터디',
    code: `#include <iostream>\nusing namespace std;\nint main() { cout << "Hello World!"; return 0; }`,
  },
  {
    id: '3',
    problemId: 1920,
    problemTitle: '수 찾기',
    tier: 'Silver IV',
    language: 'Java',
    memory: '128000KB',
    time: '1200ms',
    isSuccess: true,
    timestamp: '2026.01.16 14:30',
    sourceType: 'GAME',
    sourceDetail: '개인전',
  },
  {
    id: '4',
    problemId: 1149,
    problemTitle: 'RGB거리',
    tier: 'Silver I',
    language: 'Java',
    memory: '14536KB',
    time: '120ms',
    isSuccess: false,
    timestamp: '2026.01.12 18:45',
    sourceType: 'GAME',
    sourceDetail: '팀전',
  },
];

// 필터링 옵션 인터페이스
export interface HistoryFilter {
  startDate?: string;
  endDate?: string;
  tier?: string;
  sourceType?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSubmissionHistory(
  _nickname: string,
  _filter?: HistoryFilter,
): Promise<SubmissionHistory[]> {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Mock API delay
  return MOCK_HISTORY;
}
