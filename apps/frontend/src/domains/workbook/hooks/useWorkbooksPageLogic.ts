'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Workbook,
  WorkbookProblem,
  WorkbookTab,
  WorkbookSort,
  WorkbookProblemItem,
} from '../types';
import {
  getWorkbooks,
  getWorkbook,
  getWorkbookCounts,
  createWorkbook as createWorkbookApi,
  updateWorkbook as updateWorkbookApi,
  deleteWorkbook as deleteWorkbookApi,
  toggleWorkbookBookmark,
  type WorkbookListResponse,
  type WorkbookResponse,
} from '../api/workbookApi';

const PAGE_SIZE = 15;

// API 응답을 프론트엔드 타입으로 변환
function mapWorkbookListToWorkbook(item: WorkbookListResponse): Workbook {
  return {
    id: String(item.id),
    number: item.id,
    title: item.title,
    description: item.description || '',
    problemCount: item.problemCount,
    solvedCount: item.solvedCount,
    bookmarkCount: item.bookmarkCount,
    isBookmarked: item.isBookmarked,
    isOwner: item.isOwner,
    createdAt: item.createdAt,
    creator: {
      id: String(item.creator.id),
      nickname: item.creator.nickname || '알 수 없음',
    },
  };
}

function mapWorkbookResponseToWorkbook(item: WorkbookResponse): Workbook {
  const solvedCount = item.problems?.filter((p) => p.solved).length ?? 0;
  return {
    id: String(item.id),
    number: item.id,
    title: item.title,
    description: item.description || '',
    problemCount: item.problemCount,
    solvedCount,
    bookmarkCount: item.bookmarkCount,
    isBookmarked: item.isBookmarked,
    isOwner: item.isOwner,
    createdAt: item.createdAt,
    creator: {
      id: String(item.creator.id),
      nickname: item.creator.nickname || '알 수 없음',
    },
  };
}

function mapProblemsToWorkbookProblems(problems: WorkbookResponse['problems']): WorkbookProblem[] {
  if (!problems) return [];
  return problems.map((p) => ({
    id: p.id, // Problem 엔티티의 DB ID
    number: p.number,
    title: p.title,
    isSolved: p.solved,
    url: p.url,
  }));
}

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
  createWorkbook: (data: {
    title: string;
    description: string;
    problems: WorkbookProblemItem[];
  }) => void;
  updateWorkbook: (
    id: string,
    data: { title: string; description: string; problems: WorkbookProblemItem[] },
  ) => void;
  deleteWorkbook: (id: string) => void;

  // 새로고침
  refresh: () => void;
}

export function useWorkbooksPageLogic(): UseWorkbooksPageLogicReturn {
  // 데이터 상태
  const [workbookList, setWorkbookList] = useState<Workbook[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);

  // 선택된 문제집 상세 정보
  const [selectedWorkbookDetail, setSelectedWorkbookDetail] = useState<Workbook | null>(null);
  const [selectedProblemsList, setSelectedProblemsList] = useState<WorkbookProblem[]>([]);

  // 필터 상태
  const [tab, setTab] = useState<WorkbookTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<WorkbookSort>('LATEST');

  // 탭별 개수
  const [tabCounts, setTabCounts] = useState({ all: 0, my: 0, bookmarked: 0 });

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const isInitialLoadRef = useRef(true);

  // 선택 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 탭별 개수 조회
  const fetchCounts = useCallback(async () => {
    try {
      const counts = await getWorkbookCounts();
      setTabCounts({
        all: counts.all,
        my: counts.my,
        bookmarked: counts.bookmarked,
      });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  }, []);

  // 문제집 목록 조회
  const fetchWorkbooks = useCallback(
    async (page: number, reset: boolean = false) => {
      // 첫 로드이거나 더 불러오기일 때만 로딩 표시 (탭 전환 시 깜빡임 방지)
      if (isInitialLoadRef.current || !reset) {
        setIsLoading(true);
      }

      try {
        const response = await getWorkbooks(tab, searchQuery || undefined, sortBy, page, PAGE_SIZE);
        const mappedWorkbooks = response.content.map(mapWorkbookListToWorkbook);

        if (reset) {
          setWorkbookList(mappedWorkbooks);
        } else {
          setWorkbookList((prev) => [...prev, ...mappedWorkbooks]);
        }

        setTotalElements(response.totalElements);
        setHasMoreData(!response.last);
        setCurrentPage(page);
        isInitialLoadRef.current = false;
      } catch (error) {
        console.error('Failed to fetch workbooks:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [tab, searchQuery, sortBy],
  );

  // 선택된 문제집 상세 조회
  const fetchWorkbookDetail = useCallback(async (id: string) => {
    try {
      const response = await getWorkbook(Number(id));
      setSelectedWorkbookDetail(mapWorkbookResponseToWorkbook(response));
      setSelectedProblemsList(mapProblemsToWorkbookProblems(response.problems));
    } catch (error) {
      console.error('Failed to fetch workbook detail:', error);
      setSelectedWorkbookDetail(null);
      setSelectedProblemsList([]);
    }
  }, []);

  // 선택 변경 시 상세 조회
  useEffect(() => {
    if (selectedId) {
      fetchWorkbookDetail(selectedId);
    } else {
      setSelectedWorkbookDetail(null);
      setSelectedProblemsList([]);
    }
  }, [selectedId, fetchWorkbookDetail]);

  // 더 불러오기
  const loadMore = useCallback(() => {
    if (isLoading || !hasMoreData) return;
    fetchWorkbooks(currentPage + 1, false);
  }, [isLoading, hasMoreData, currentPage, fetchWorkbooks]);

  // 필터 변경 시 리셋
  const handleSetTab = useCallback((newTab: WorkbookTab) => {
    setTab(newTab);
    setSelectedId(null);
    setCurrentPage(0);
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);
  }, []);

  const handleSetSortBy = useCallback((sort: WorkbookSort) => {
    setSortBy(sort);
    setCurrentPage(0);
  }, []);

  // 초기 로드 및 필터 변경 시 데이터 로드 (한 번만)
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchWorkbooks(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, searchQuery, sortBy]);

  // 북마크 토글
  const toggleBookmark = useCallback(
    async (id: string) => {
      try {
        const result = await toggleWorkbookBookmark(Number(id));

        // 즐겨찾기 탭에서 즐겨찾기 취소 시 목록에서 제거
        if (tab === 'BOOKMARKED' && !result.isBookmarked) {
          setWorkbookList((prev) => prev.filter((w) => w.id !== id));
          setTotalElements((prev) => prev - 1);

          // 선택된 문제집이면 선택 해제
          if (selectedId === id) {
            setSelectedId(null);
          }
        } else {
          // 다른 탭에서는 상태만 업데이트
          setWorkbookList((prev) =>
            prev.map((w) =>
              w.id === id
                ? {
                    ...w,
                    isBookmarked: result.isBookmarked,
                    bookmarkCount: result.isBookmarked ? w.bookmarkCount + 1 : w.bookmarkCount - 1,
                  }
                : w,
            ),
          );
        }

        // 선택된 문제집도 업데이트
        if (selectedWorkbookDetail?.id === id) {
          setSelectedWorkbookDetail((prev) =>
            prev
              ? {
                  ...prev,
                  isBookmarked: result.isBookmarked,
                  bookmarkCount: result.isBookmarked
                    ? prev.bookmarkCount + 1
                    : prev.bookmarkCount - 1,
                }
              : null,
          );
        }

        // 개수 다시 조회
        fetchCounts();
      } catch (error) {
        console.error('Failed to toggle bookmark:', error);
      }
    },
    [tab, selectedId, selectedWorkbookDetail, fetchCounts],
  );

  // 문제집 생성
  const createWorkbook = useCallback(
    async (data: { title: string; description: string; problems: WorkbookProblemItem[] }) => {
      try {
        const problemIds = data.problems
          .map((p) => p.problemId)
          .filter((id): id is number => id !== undefined);

        const response = await createWorkbookApi({
          title: data.title,
          description: data.description,
          problemIds,
        });

        const newWorkbook = mapWorkbookResponseToWorkbook(response);

        // 즐겨찾기 탭에서는 새 문제집이 즐겨찾기 되어있지 않으므로 목록에 추가하지 않음
        if (tab === 'BOOKMARKED') {
          // 개수만 다시 조회
          fetchCounts();
          return;
        }

        // 최신순 정렬일 때만 맨 앞에 추가 (새 문제집이 가장 최신이므로)
        // 다른 정렬에서는 목록을 새로고침하여 서버 정렬과 일치시킴
        if (sortBy === 'LATEST') {
          setWorkbookList((prev) => [newWorkbook, ...prev]);
          setTotalElements((prev) => prev + 1);
          setSelectedId(newWorkbook.id);
        } else {
          // 다른 정렬 기준에서는 목록 새로고침
          await fetchWorkbooks(0, true);
          setSelectedId(newWorkbook.id);
        }

        // 개수 다시 조회
        fetchCounts();
      } catch (error) {
        console.error('Failed to create workbook:', error);
      }
    },
    [tab, sortBy, fetchCounts, fetchWorkbooks],
  );

  // 문제집 수정
  const updateWorkbook = useCallback(
    async (
      id: string,
      data: { title: string; description: string; problems: WorkbookProblemItem[] },
    ) => {
      try {
        const problemIds = data.problems
          .map((p) => p.problemId)
          .filter((id): id is number => id !== undefined);

        const response = await updateWorkbookApi(Number(id), {
          title: data.title,
          description: data.description,
          problemIds,
        });

        const updatedWorkbook = mapWorkbookResponseToWorkbook(response);

        // 목록 업데이트
        setWorkbookList((prev) => prev.map((w) => (w.id === id ? updatedWorkbook : w)));

        // 선택된 문제집도 업데이트
        if (selectedId === id) {
          setSelectedWorkbookDetail(updatedWorkbook);
          setSelectedProblemsList(mapProblemsToWorkbookProblems(response.problems));
        }
      } catch (error) {
        console.error('Failed to update workbook:', error);
      }
    },
    [selectedId],
  );

  // 문제집 삭제
  const deleteWorkbook = useCallback(
    async (id: string) => {
      try {
        await deleteWorkbookApi(Number(id));

        // 목록에서 제거
        setWorkbookList((prev) => prev.filter((w) => w.id !== id));
        setTotalElements((prev) => prev - 1);

        // 선택 해제
        if (selectedId === id) {
          setSelectedId(null);
        }

        // 개수 다시 조회
        fetchCounts();
      } catch (error) {
        console.error('Failed to delete workbook:', error);
      }
    },
    [selectedId, fetchCounts],
  );

  // 새로고침
  const refresh = useCallback(() => {
    fetchCounts();
    fetchWorkbooks(0, true);
  }, [fetchCounts, fetchWorkbooks]);

  return {
    tab,
    setTab: handleSetTab,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    sortBy,
    setSortBy: handleSetSortBy,
    tabCounts,
    workbooks: workbookList,
    totalCount: totalElements,
    selectedWorkbook: selectedWorkbookDetail,
    selectedProblems: selectedProblemsList,
    hasMore: hasMoreData,
    isLoading,
    loadMore,
    selectedId,
    setSelectedId,
    toggleBookmark,
    createWorkbook,
    updateWorkbook,
    deleteWorkbook,
    refresh,
  };
}
