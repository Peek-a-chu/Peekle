'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkbooksPageLogic } from '@/domains/workbook/hooks/useWorkbooksPageLogic';
import {
  WorkbooksHeader,
  WorkbooksFilter,
  WorkbooksLeftPanel,
  WorkbooksRightPanel,
} from '@/domains/workbook/layout';
import { WorkbookModal } from '@/domains/workbook/components/WorkbookModal';
import type { WorkbookProblemItem } from '@/domains/workbook/types';

function WorkbooksContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const {
    tab,
    setTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
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
  } = useWorkbooksPageLogic(initialId);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const handleCreateClick = () => {
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEditClick = () => {
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleClosePanel = () => {
    setSelectedId(null);
  };

  const handleModalSubmit = (data: {
    title: string;
    description: string;
    problems: WorkbookProblemItem[];
  }) => {
    if (modalMode === 'create') {
      createWorkbook(data);
    } else if (selectedId) {
      updateWorkbook(selectedId, data);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <div
          className={`h-full flex flex-col transition-all duration-200 ${selectedWorkbook ? 'pr-[476px]' : ''}`}
        >
          {/* 헤더 */}
          <WorkbooksHeader onCreateClick={handleCreateClick} className="mb-4" />

          {/* 필터 */}
          <WorkbooksFilter
            tab={tab}
            onTabChange={setTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            tabCounts={tabCounts}
            className="mb-4"
          />

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0">
            <WorkbooksLeftPanel
              workbooks={workbooks}
              totalCount={totalCount}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggleBookmark={toggleBookmark}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
            />
          </div>
        </div>

        {/* 우측 패널 - 전체 높이 */}
        {selectedWorkbook && (
          <WorkbooksRightPanel
            workbook={selectedWorkbook}
            problems={selectedProblems}
            onClose={handleClosePanel}
            onEdit={handleEditClick}
            onDelete={() => selectedId && deleteWorkbook(selectedId)}
            className="fixed top-0 right-0 bottom-0"
          />
        )}

        {/* 문제집 생성/수정 모달 */}
        <WorkbookModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
          workbook={modalMode === 'edit' ? selectedWorkbook : null}
          problems={modalMode === 'edit' ? selectedProblems : []}
          onSubmit={handleModalSubmit}
        />
      </div>
    </div>
  );
}

export default function WorkbooksPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8">Loading...</div>}>
      <WorkbooksContent />
    </Suspense>
  );
}
