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
