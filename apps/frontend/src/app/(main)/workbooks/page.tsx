'use client';

import { useRouter } from 'next/navigation';
import { useWorkbooksPageLogic } from '@/domains/workbook/hooks/useWorkbooksPageLogic';
import {
  WorkbooksHeader,
  WorkbooksFilter,
  WorkbooksLeftPanel,
  WorkbooksRightPanel,
} from '@/domains/workbook/layout';

export default function WorkbooksPage() {
  const router = useRouter();
  const {
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
  } = useWorkbooksPageLogic();

  const handleCreateClick = () => {
    router.push('/workbooks/new');
  };

  const handleClosePanel = () => {
    setSelectedId(null);
  };

  return (
    <div className="h-[calc(100vh-64px)] relative">
      <div className={`h-full flex flex-col transition-all duration-200 ${selectedWorkbook ? 'pr-[476px]' : ''}`}>
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
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleBookmark={toggleBookmark}
          />
        </div>
      </div>

      {/* 우측 패널 - 전체 높이 */}
      {selectedWorkbook && (
        <WorkbooksRightPanel
          workbook={selectedWorkbook}
          problems={selectedProblems}
          onClose={handleClosePanel}
          className="fixed top-0 right-0 bottom-0"
        />
      )}
    </div>
  );
}
