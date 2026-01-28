export interface Workbook {
  id: string;
  number: number;
  title: string;
  description: string;
  problemCount: number;
  solvedCount: number;
  bookmarkCount: number;
  isBookmarked: boolean;
  isOwner: boolean;
  createdAt: string;
  creator: {
    id: string;
    nickname: string;
  };
}

export interface WorkbookProblem {
  id: number;
  number: number;
  title: string;
  isSolved: boolean;
  url: string;
}

export type WorkbookTab = 'ALL' | 'MY' | 'BOOKMARKED';
export type WorkbookSort = 'LATEST' | 'OLDEST' | 'BOOKMARKS' | 'PROBLEMS';

// 모달에서 사용하는 문제 타입 (드래그앤드롭용 id 포함)
export interface WorkbookProblemItem {
  id: string;
  number: number;
  title: string;
}

// 문제집 생성/수정 폼 데이터
export interface WorkbookFormData {
  title: string;
  description: string;
  problems: WorkbookProblemItem[];
}
