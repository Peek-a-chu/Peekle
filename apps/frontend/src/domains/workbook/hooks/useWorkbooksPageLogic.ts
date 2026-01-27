'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  mockWorkbooks,
  mockWorkbookProblems,
  filterWorkbooks,
  getTabCounts,
} from '../mocks/mockData';
import type { Workbook, WorkbookProblem, WorkbookTab, WorkbookSort } from '../types';

export interface UseWorkbooksPageLogicReturn {
  // 필터 상태
  tab: WorkbookTab;
  setTab: (tab: WorkbookTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: WorkbookSort;
  setSortBy: (sort: WorkbookSort) => void;
  tabCounts: { all: number; my: number; bookmarked: number };

  // 데이터
  workbooks: Workbook[];
  selectedWorkbook: Workbook | null;
  selectedProblems: WorkbookProblem[];

  // 선택 상태
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // 액션
  toggleBookmark: (id: string) => void;
}

export function useWorkbooksPageLogic(): UseWorkbooksPageLogicReturn {
  // 로컬 상태로 문제집 목록 관리 (북마크 토글용)
  const [workbookList, setWorkbookList] = useState<Workbook[]>(mockWorkbooks);

  // 필터 상태
  const [tab, setTab] = useState<WorkbookTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<WorkbookSort>('LATEST');

  // 선택 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 필터링된 문제집 목록
  const workbooks = useMemo(() => {
    return filterWorkbooks(workbookList, tab, searchQuery, sortBy);
  }, [workbookList, tab, searchQuery, sortBy]);

  // 탭별 개수
  const tabCounts = useMemo(() => getTabCounts(workbookList), [workbookList]);

  // 선택된 문제집
  const selectedWorkbook = useMemo(() => {
    if (!selectedId) return null;
    return workbookList.find((w) => w.id === selectedId) || null;
  }, [workbookList, selectedId]);

  // 선택된 문제집의 문제 목록
  const selectedProblems = useMemo(() => {
    if (!selectedId) return [];
    return mockWorkbookProblems[selectedId] || [];
  }, [selectedId]);

  // 북마크 토글
  const toggleBookmark = useCallback((id: string) => {
    setWorkbookList((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isBookmarked: !w.isBookmarked,
              bookmarkCount: w.isBookmarked ? w.bookmarkCount - 1 : w.bookmarkCount + 1,
            }
          : w
      )
    );
  }, []);

  return {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    tabCounts,
    workbooks,
    selectedWorkbook,
    selectedProblems,
    selectedId,
    setSelectedId,
    toggleBookmark,
  };
}
