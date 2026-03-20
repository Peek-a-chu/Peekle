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
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

function WorkbooksContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const isMobile = useIsMobile();

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
          className={cn(
            'h-full flex flex-col transition-all duration-200',
            selectedWorkbook && !isMobile && 'pr-[476px]',
          )}
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
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* 우측 패널 - 전체 높이 */}
        {selectedWorkbook && (
          <>
            {isMobile && (
              <button
                type="button"
                className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[59] bg-black/35"
                onClick={handleClosePanel}
                aria-label="문제집 상세 닫기"
              />
            )}
            <WorkbooksRightPanel
              workbook={selectedWorkbook}
              problems={selectedProblems}
              onClose={handleClosePanel}
              onEdit={isMobile ? undefined : handleEditClick}
              onDelete={isMobile ? undefined : () => selectedId && deleteWorkbook(selectedId)}
              allowManage={!isMobile}
              isMobile={isMobile}
              className={cn(
                'fixed z-[60]',
                isMobile
                  ? 'inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] w-auto border-l-0 border-t-0 rounded-none'
                  : 'top-0 right-0 bottom-0',
              )}
            />
          </>
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
