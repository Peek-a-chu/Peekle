import type { Workbook, WorkbookProblem, WorkbookTab, WorkbookSort, BojProblem } from '../types';

// 기본 문제집 템플릿
const baseWorkbooks: Omit<Workbook, 'id' | 'number' | 'createdAt'>[] = [
  {
    title: '초보자를 위한 기초 문제집',
    description: '프로그래밍을 처음 시작하는 분들을 위한 입문 문제집입니다.',
    problemCount: 10,
    solvedCount: 3,
    bookmarkCount: 156,
    isBookmarked: false,
    isOwner: true,
    creator: { id: 'user1', nickname: '김코딩' },
  },
  {
    title: '그래프 완전 정복',
    description: 'BFS, DFS부터 다익스트라까지 그래프 알고리즘 총정리',
    problemCount: 15,
    solvedCount: 8,
    bookmarkCount: 89,
    isBookmarked: true,
    isOwner: false,
    creator: { id: 'user2', nickname: 'AlgoKing' },
  },
  {
    title: 'DP 입문',
    description: '동적 프로그래밍의 기초부터 응용까지',
    problemCount: 8,
    solvedCount: 8,
    bookmarkCount: 234,
    isBookmarked: false,
    isOwner: true,
    creator: { id: 'user1', nickname: '김코딩' },
  },
  {
    title: '삼성 SW 역량테스트 대비',
    description: '삼성 코딩테스트 기출 유형 분석 및 연습',
    problemCount: 20,
    solvedCount: 5,
    bookmarkCount: 512,
    isBookmarked: true,
    isOwner: false,
    creator: { id: 'user3', nickname: '취준생' },
  },
  {
    title: '백준 브론즈 탈출하기',
    description: '브론즈에서 실버로 올라가기 위한 필수 문제들',
    problemCount: 25,
    solvedCount: 12,
    bookmarkCount: 78,
    isBookmarked: false,
    isOwner: false,
    creator: { id: 'user4', nickname: '알고리즘마스터' },
  },
  {
    title: '문자열 처리 완벽 가이드',
    description: 'KMP, 트라이, 해싱 등 문자열 알고리즘 총정리',
    problemCount: 18,
    solvedCount: 5,
    bookmarkCount: 145,
    isBookmarked: false,
    isOwner: true,
    creator: { id: 'user1', nickname: '김코딩' },
  },
  {
    title: '이분탐색 마스터',
    description: '이분탐색의 기초부터 parametric search까지',
    problemCount: 12,
    solvedCount: 7,
    bookmarkCount: 203,
    isBookmarked: true,
    isOwner: false,
    creator: { id: 'user5', nickname: 'BinaryKing' },
  },
  {
    title: '트리 자료구조 정복',
    description: '세그먼트 트리, 펜윅 트리, LCA 등',
    problemCount: 22,
    solvedCount: 3,
    bookmarkCount: 167,
    isBookmarked: false,
    isOwner: false,
    creator: { id: 'user6', nickname: 'TreeLover' },
  },
];

// 50개의 문제집 생성
function generateMockWorkbooks(): Workbook[] {
  const workbooks: Workbook[] = [];
  const nicknames = ['김코딩', 'AlgoKing', '취준생', '알고리즘마스터', 'BinaryKing', 'TreeLover', 'CodeNinja', 'PS천재', '백준러', 'ACM준비생'];

  for (let i = 0; i < 50; i++) {
    const base = baseWorkbooks[i % baseWorkbooks.length];
    const date = new Date('2026-01-25');
    date.setDate(date.getDate() - i);

    workbooks.push({
      ...base,
      id: `wb${i + 1}`,
      number: i + 1,
      title: i < baseWorkbooks.length ? base.title : `${base.title} ${Math.floor(i / baseWorkbooks.length) + 1}`,
      bookmarkCount: Math.floor(Math.random() * 500) + 10,
      isBookmarked: Math.random() > 0.7,
      isOwner: i % 3 === 0,
      createdAt: date.toISOString(),
      creator: {
        id: `user${(i % 10) + 1}`,
        nickname: nicknames[i % nicknames.length]
      },
    });
  }

  return workbooks;
}

export const mockWorkbooks: Workbook[] = generateMockWorkbooks();

export const mockWorkbookProblems: Record<string, WorkbookProblem[]> = {
  wb1: [
    { id: 1, number: 1000, title: 'A+B', isSolved: true, url: 'https://www.acmicpc.net/problem/1000' },
    { id: 2, number: 1001, title: 'A-B', isSolved: true, url: 'https://www.acmicpc.net/problem/1001' },
    { id: 3, number: 10998, title: 'A×B', isSolved: true, url: 'https://www.acmicpc.net/problem/10998' },
    { id: 4, number: 1008, title: 'A/B', isSolved: false, url: 'https://www.acmicpc.net/problem/1008' },
    { id: 5, number: 10869, title: '사칙연산', isSolved: false, url: 'https://www.acmicpc.net/problem/10869' },
    { id: 6, number: 10430, title: '나머지', isSolved: false, url: 'https://www.acmicpc.net/problem/10430' },
    { id: 7, number: 2588, title: '곱셈', isSolved: false, url: 'https://www.acmicpc.net/problem/2588' },
    { id: 8, number: 10171, title: '고양이', isSolved: false, url: 'https://www.acmicpc.net/problem/10171' },
    { id: 9, number: 10172, title: '개', isSolved: false, url: 'https://www.acmicpc.net/problem/10172' },
    { id: 10, number: 1330, title: '두 수 비교하기', isSolved: false, url: 'https://www.acmicpc.net/problem/1330' },
  ],
  wb2: [
    { id: 11, number: 1260, title: 'DFS와 BFS', isSolved: true, url: 'https://www.acmicpc.net/problem/1260' },
    { id: 12, number: 2606, title: '바이러스', isSolved: true, url: 'https://www.acmicpc.net/problem/2606' },
    { id: 13, number: 1753, title: '최단경로', isSolved: true, url: 'https://www.acmicpc.net/problem/1753' },
    { id: 14, number: 1916, title: '최소비용 구하기', isSolved: true, url: 'https://www.acmicpc.net/problem/1916' },
    { id: 15, number: 11404, title: '플로이드', isSolved: true, url: 'https://www.acmicpc.net/problem/11404' },
    { id: 16, number: 1956, title: '운동', isSolved: true, url: 'https://www.acmicpc.net/problem/1956' },
    { id: 17, number: 11657, title: '타임머신', isSolved: true, url: 'https://www.acmicpc.net/problem/11657' },
    { id: 18, number: 1504, title: '특정한 최단 경로', isSolved: true, url: 'https://www.acmicpc.net/problem/1504' },
    { id: 19, number: 9370, title: '미확인 도착지', isSolved: false, url: 'https://www.acmicpc.net/problem/9370' },
    { id: 20, number: 11779, title: '최소비용 구하기 2', isSolved: false, url: 'https://www.acmicpc.net/problem/11779' },
    { id: 21, number: 1238, title: '파티', isSolved: false, url: 'https://www.acmicpc.net/problem/1238' },
    { id: 22, number: 10217, title: 'KCM Travel', isSolved: false, url: 'https://www.acmicpc.net/problem/10217' },
    { id: 23, number: 1854, title: 'K번째 최단경로 찾기', isSolved: false, url: 'https://www.acmicpc.net/problem/1854' },
    { id: 24, number: 5719, title: '거의 최단 경로', isSolved: false, url: 'https://www.acmicpc.net/problem/5719' },
    { id: 25, number: 11562, title: '백양로 브레이크', isSolved: false, url: 'https://www.acmicpc.net/problem/11562' },
  ],
  wb3: [
    { id: 26, number: 1003, title: '피보나치 함수', isSolved: true, url: 'https://www.acmicpc.net/problem/1003' },
    { id: 27, number: 9184, title: '신나는 함수 실행', isSolved: true, url: 'https://www.acmicpc.net/problem/9184' },
    { id: 28, number: 1904, title: '01타일', isSolved: true, url: 'https://www.acmicpc.net/problem/1904' },
    { id: 29, number: 9461, title: '파도반 수열', isSolved: true, url: 'https://www.acmicpc.net/problem/9461' },
    { id: 30, number: 1149, title: 'RGB거리', isSolved: true, url: 'https://www.acmicpc.net/problem/1149' },
    { id: 31, number: 1932, title: '정수 삼각형', isSolved: true, url: 'https://www.acmicpc.net/problem/1932' },
    { id: 32, number: 2579, title: '계단 오르기', isSolved: true, url: 'https://www.acmicpc.net/problem/2579' },
    { id: 33, number: 1463, title: '1로 만들기', isSolved: true, url: 'https://www.acmicpc.net/problem/1463' },
  ],
  wb4: [
    { id: 34, number: 13460, title: '구슬 탈출 2', isSolved: true, url: 'https://www.acmicpc.net/problem/13460' },
    { id: 35, number: 12100, title: '2048 (Easy)', isSolved: true, url: 'https://www.acmicpc.net/problem/12100' },
    { id: 36, number: 14501, title: '퇴사', isSolved: true, url: 'https://www.acmicpc.net/problem/14501' },
    { id: 37, number: 14502, title: '연구소', isSolved: true, url: 'https://www.acmicpc.net/problem/14502' },
    { id: 38, number: 14503, title: '로봇 청소기', isSolved: true, url: 'https://www.acmicpc.net/problem/14503' },
    { id: 39, number: 14888, title: '연산자 끼워넣기', isSolved: false, url: 'https://www.acmicpc.net/problem/14888' },
    { id: 40, number: 14889, title: '스타트와 링크', isSolved: false, url: 'https://www.acmicpc.net/problem/14889' },
    { id: 41, number: 14890, title: '경사로', isSolved: false, url: 'https://www.acmicpc.net/problem/14890' },
    { id: 42, number: 14891, title: '톱니바퀴', isSolved: false, url: 'https://www.acmicpc.net/problem/14891' },
    { id: 43, number: 15683, title: '감시', isSolved: false, url: 'https://www.acmicpc.net/problem/15683' },
    { id: 44, number: 15684, title: '사다리 조작', isSolved: false, url: 'https://www.acmicpc.net/problem/15684' },
    { id: 45, number: 15685, title: '드래곤 커브', isSolved: false, url: 'https://www.acmicpc.net/problem/15685' },
    { id: 46, number: 15686, title: '치킨 배달', isSolved: false, url: 'https://www.acmicpc.net/problem/15686' },
    { id: 47, number: 16234, title: '인구 이동', isSolved: false, url: 'https://www.acmicpc.net/problem/16234' },
    { id: 48, number: 16235, title: '나무 재테크', isSolved: false, url: 'https://www.acmicpc.net/problem/16235' },
    { id: 49, number: 16236, title: '아기 상어', isSolved: false, url: 'https://www.acmicpc.net/problem/16236' },
    { id: 50, number: 17140, title: '이차원 배열과 연산', isSolved: false, url: 'https://www.acmicpc.net/problem/17140' },
    { id: 51, number: 17143, title: '낚시왕', isSolved: false, url: 'https://www.acmicpc.net/problem/17143' },
    { id: 52, number: 17144, title: '미세먼지 안녕!', isSolved: false, url: 'https://www.acmicpc.net/problem/17144' },
    { id: 53, number: 20056, title: '마법사 상어와 파이어볼', isSolved: false, url: 'https://www.acmicpc.net/problem/20056' },
  ],
};

export function filterWorkbooks(
  workbooks: Workbook[],
  tab: WorkbookTab,
  searchQuery: string,
  sortBy: WorkbookSort
): Workbook[] {
  let result = [...workbooks];

  // 탭 필터
  if (tab === 'MY') {
    result = result.filter((w) => w.isOwner);
  } else if (tab === 'BOOKMARKED') {
    result = result.filter((w) => w.isBookmarked);
  }

  // 검색 필터
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query)
    );
  }

  // 정렬
  switch (sortBy) {
    case 'LATEST':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'OLDEST':
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'BOOKMARKS':
      result.sort((a, b) => b.bookmarkCount - a.bookmarkCount);
      break;
    case 'PROBLEMS':
      result.sort((a, b) => b.problemCount - a.problemCount);
      break;
  }

  return result;
}

export function getTabCounts(workbooks: Workbook[]) {
  return {
    all: workbooks.length,
    my: workbooks.filter((w) => w.isOwner).length,
    bookmarked: workbooks.filter((w) => w.isBookmarked).length,
  };
}

// 백준 문제 검색용 전체 목록
export const mockAllBojProblems: BojProblem[] = [
  { number: 1000, title: 'A+B' },
  { number: 1001, title: 'A-B' },
  { number: 1002, title: '터렛' },
  { number: 1003, title: '피보나치 함수' },
  { number: 1008, title: 'A/B' },
  { number: 1149, title: 'RGB거리' },
  { number: 1152, title: '단어의 개수' },
  { number: 1157, title: '단어 공부' },
  { number: 1260, title: 'DFS와 BFS' },
  { number: 1330, title: '두 수 비교하기' },
  { number: 1463, title: '1로 만들기' },
  { number: 1504, title: '특정한 최단 경로' },
  { number: 1753, title: '최단경로' },
  { number: 1854, title: 'K번째 최단경로 찾기' },
  { number: 1904, title: '01타일' },
  { number: 1916, title: '최소비용 구하기' },
  { number: 1932, title: '정수 삼각형' },
  { number: 1956, title: '운동' },
  { number: 2178, title: '미로 탐색' },
  { number: 2438, title: '별 찍기 - 1' },
  { number: 2557, title: 'Hello World' },
  { number: 2579, title: '계단 오르기' },
  { number: 2588, title: '곱셈' },
  { number: 2606, title: '바이러스' },
  { number: 2667, title: '단지번호붙이기' },
  { number: 2750, title: '수 정렬하기' },
  { number: 2751, title: '수 정렬하기 2' },
  { number: 2753, title: '윤년' },
  { number: 5719, title: '거의 최단 경로' },
  { number: 9184, title: '신나는 함수 실행' },
  { number: 9370, title: '미확인 도착지' },
  { number: 9461, title: '파도반 수열' },
  { number: 10171, title: '고양이' },
  { number: 10172, title: '개' },
  { number: 10217, title: 'KCM Travel' },
  { number: 10430, title: '나머지' },
  { number: 10869, title: '사칙연산' },
  { number: 10998, title: 'A×B' },
  { number: 11404, title: '플로이드' },
  { number: 11562, title: '백양로 브레이크' },
  { number: 11657, title: '타임머신' },
  { number: 11779, title: '최소비용 구하기 2' },
  { number: 12100, title: '2048 (Easy)' },
  { number: 13460, title: '구슬 탈출 2' },
  { number: 14501, title: '퇴사' },
  { number: 14502, title: '연구소' },
  { number: 14503, title: '로봇 청소기' },
  { number: 14888, title: '연산자 끼워넣기' },
  { number: 14889, title: '스타트와 링크' },
  { number: 14890, title: '경사로' },
  { number: 14891, title: '톱니바퀴' },
  { number: 15683, title: '감시' },
  { number: 15684, title: '사다리 조작' },
  { number: 15685, title: '드래곤 커브' },
  { number: 15686, title: '치킨 배달' },
  { number: 16234, title: '인구 이동' },
  { number: 16235, title: '나무 재테크' },
  { number: 16236, title: '아기 상어' },
  { number: 17140, title: '이차원 배열과 연산' },
  { number: 17143, title: '낚시왕' },
  { number: 17144, title: '미세먼지 안녕!' },
  { number: 1238, title: '파티' },
  { number: 20056, title: '마법사 상어와 파이어볼' },
];
