'use client';

import { Search, Plus, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStudyListPageLogic } from '@/domains/study/hooks/useStudyListPageLogic';
import { CCStudyCard } from '@/domains/study/components/CCStudyCard';
import { CCJoinStudyModal } from '@/domains/study/components/CCJoinStudyModal';
import { CCCreateStudyModal } from '@/domains/study/components/CCCreateStudyModal';
import type { StudyListContent, StudyRoomDetail } from '@/domains/study/types';
import { useRouter } from 'next/navigation';

export function CCStudyListPage() {
  const router = useRouter();

  const {
    studies,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    joinModalOpen,
    setJoinModalOpen,
    createModalOpen,
    setCreateModalOpen,
    // handleStudyClick, // We handle click locally now
    handleCreateSuccess,
    // handleJoinSuccess, // We handle this locally now
    refetch,
  } = useStudyListPageLogic();

  const handleInviteSuccess = (study: StudyRoomDetail) => {
    setJoinModalOpen(false);
    void refetch();
    // Move to study room first; pre-join modal should appear inside room page.
    router.push(`/study/${study.id}`);
  };

  const handleCardClick = (studyId: number) => {
    router.push(`/study/${studyId}`);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header with Action Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">나의 스터디</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setJoinModalOpen(true)} className="gap-2">
              <LogIn className="h-4 w-4" />
              참여하기
            </Button>
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />방 만들기
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="스터디 제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Study List Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-destructive mb-2">스터디 목록을 불러오는데 실패했습니다</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
            </p>
          </div>
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground mb-2">참여 중인 스터디가 없습니다</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? '검색 결과가 없습니다'
                : '새로운 스터디에 참여하거나 방을 만들어보세요'}
            </p>
            {!searchQuery && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setJoinModalOpen(true)}>
                  참여하기
                </Button>
                <Button onClick={() => setCreateModalOpen(true)}>방 만들기</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-3">
            {studies.map((study, index) => (
              <CCStudyCard
                key={study.id}
                study={study}
                rank={index + 1}
                onClick={() => handleCardClick(study.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CCJoinStudyModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onSuccess={handleInviteSuccess}
      />
      <CCCreateStudyModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
