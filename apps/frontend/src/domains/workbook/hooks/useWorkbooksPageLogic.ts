'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  mockWorkbooks,
  mockWorkbookProblems,
  filterWorkbooks,
  getTabCounts,
} from '../mocks/mockData';
import type { Workbook, WorkbookProblem, WorkbookTab, WorkbookSort, WorkbookProblemItem } from '../types';

const PAGE_SIZE = 15;

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
  totalCount: number;
  selectedWorkbook: Workbook | null;
  selectedProblems: WorkbookProblem[];

  // 무한 스크롤
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;

  // 선택 상태
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // 액션
  toggleBookmark: (id: string) => void;
  createWorkbook: (data: { title: string; description: string; problems: WorkbookProblemItem[] }) => void;
  updateWorkbook: (id: string, data: { title: string; description: string; problems: WorkbookProblemItem[] }) => void;
  deleteWorkbook: (id: string) => void;
}

export function useWorkbooksPageLogic(): UseWorkbooksPageLogicReturn {
  // 로컬 상태로 문제집 목록 관리
  const [workbookList, setWorkbookList] = useState<Workbook[]>(mockWorkbooks);

  // 문제집별 문제 목록도 상태로 관리
  const [problemsMap, setProblemsMap] = useState<Record<string, WorkbookProblem[]>>(mockWorkbookProblems);

  // 필터 상태
  const [tab, setTab] = useState<WorkbookTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<WorkbookSort>('LATEST');

  // 페이징 상태
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  // 선택 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 필터링된 전체 문제집 목록
  const filteredWorkbooks = useMemo(() => {
    return filterWorkbooks(workbookList, tab, searchQuery, sortBy);
  }, [workbookList, tab, searchQuery, sortBy]);

  // 현재 표시할 문제집 (페이징 적용)
  const workbooks = useMemo(() => {
    return filteredWorkbooks.slice(0, displayCount);
  }, [filteredWorkbooks, displayCount]);

  // 더 불러올 데이터가 있는지
  const hasMore = displayCount < filteredWorkbooks.length;

  // 총 개수
  const totalCount = filteredWorkbooks.length;

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
    return problemsMap[selectedId] || [];
  }, [selectedId, problemsMap]);

  // 더 불러오기
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    // 실제 API에서는 여기서 fetch
    setTimeout(() => {
      setDisplayCount((prev) => prev + PAGE_SIZE);
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore]);

  // 필터 변경 시 페이징 리셋
  const handleSetTab = useCallback((newTab: WorkbookTab) => {
    setTab(newTab);
    setDisplayCount(PAGE_SIZE);
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setDisplayCount(PAGE_SIZE);
  }, []);

  const handleSetSortBy = useCallback((sort: WorkbookSort) => {
    setSortBy(sort);
    setDisplayCount(PAGE_SIZE);
  }, []);

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

  // 문제집 생성
  const createWorkbook = useCallback((data: { title: string; description: string; problems: WorkbookProblemItem[] }) => {
    const newId = `workbook-${Date.now()}`;
    const maxNumber = Math.max(...workbookList.map(w => w.number), 0);

    const newWorkbook: Workbook = {
      id: newId,
      number: maxNumber + 1,
      title: data.title,
      description: data.description,
      problemCount: data.problems.length,
      solvedCount: 0,
      bookmarkCount: 0,
      isBookmarked: false,
      isOwner: true,
      createdAt: new Date().toISOString(),
      creator: {
        id: 'current-user',
        nickname: '나',
      },
    };

    const newProblems: WorkbookProblem[] = data.problems.map((p, index) => ({
      id: index + 1,
      number: p.number,
      title: p.title,
      isSolved: false,
      url: `https://www.acmicpc.net/problem/${p.number}`,
    }));

    setWorkbookList((prev) => [newWorkbook, ...prev]);
    setProblemsMap((prev) => ({ ...prev, [newId]: newProblems }));
    setSelectedId(newId);
  }, [workbookList]);

  // 문제집 수정
  const updateWorkbook = useCallback((id: string, data: { title: string; description: string; problems: WorkbookProblemItem[] }) => {
    setWorkbookList((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              title: data.title,
              description: data.description,
              problemCount: data.problems.length,
              createdAt: new Date().toISOString(),
            }
          : w
      )
    );

    const updatedProblems: WorkbookProblem[] = data.problems.map((p, index) => {
      const existing = problemsMap[id]?.find((ep) => ep.number === p.number);
      return {
        id: index + 1,
        number: p.number,
        title: p.title,
        isSolved: existing?.isSolved ?? false,
        url: `https://www.acmicpc.net/problem/${p.number}`,
      };
    });

    setProblemsMap((prev) => ({ ...prev, [id]: updatedProblems }));
  }, [problemsMap]);

  // 문제집 삭제
  const deleteWorkbook = useCallback((id: string) => {
    setWorkbookList((prev) => prev.filter((w) => w.id !== id));
    setProblemsMap((prev) => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    setSelectedId(null);
  }, []);

  return {
    tab,
    setTab: handleSetTab,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    sortBy,
    setSortBy: handleSetSortBy,
    tabCounts,
    workbooks,
    totalCount,
    selectedWorkbook,
    selectedProblems,
    hasMore,
    isLoading,
    loadMore,
    selectedId,
    setSelectedId,
    toggleBookmark,
    createWorkbook,
    updateWorkbook,
    deleteWorkbook,
  };
}
