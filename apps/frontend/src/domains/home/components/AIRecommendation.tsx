'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ExternalLink, Plus, Loader2, MessageCircle, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAIRecommendations } from '../hooks/useDashboardData';
import { BOJ_TIER_NAMES, BOJ_TIER_COLORS } from '../mocks/dashboardMocks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

import { AIRecommendationData } from '../mocks/dashboardMocks';
import { AddToWorkbookModal } from '@/domains/workbook/components/AddToWorkbookModal';
import { fetchMyStudies } from '@/domains/study/api/studyApi';
import type { StudyListContent } from '@/domains/study/types';
import { CCCreateStudyModal } from '@/domains/study/components/CCCreateStudyModal';
import { useIsMobile } from '@/hooks/useIsMobile';

interface AIRecommendationProps {
  initialData?: AIRecommendationData[];
}

const AIRecommendation = ({ initialData }: AIRecommendationProps) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const hasInitialData = Array.isArray(initialData) && initialData.length > 0;
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: fetchedData, isLoading } = useAIRecommendations({
    skip: hasInitialData,
    refreshKey,
  });
  const data = hasInitialData ? initialData : fetchedData || [];

  // 로딩 중이거나 초기 데이터가 없는 경우의 처리
  const showLoading = !hasInitialData && isLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [selectedStudyProblem, setSelectedStudyProblem] = useState<{
    externalId: string;
    title: string;
  } | null>(null);
  const [openTagProblemId, setOpenTagProblemId] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isCreateStudyOpen, setIsCreateStudyOpen] = useState(false);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [studyLoadError, setStudyLoadError] = useState<string | null>(null);
  const [isWaitingCreatedStudy, setIsWaitingCreatedStudy] = useState(false);
  const [studyList, setStudyList] = useState<StudyListContent[]>([]);

  // 피드백 관련 상태
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);

  // 기존 피드백 조회
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await apiFetch<string | null>('/api/recommendations/feedback');
        if (res.success && res.data) {
          setCurrentFeedback(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch feedback:', e);
      } finally {
        setIsFeedbackLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  useEffect(() => {
    if (!showLoading) {
      setCanRetry(false);
      return;
    }

    const timer = setTimeout(() => {
      setCanRetry(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [showLoading]);

  const handleRetry = () => {
    setCanRetry(false);
    setRefreshKey(Date.now());
  };

  const handleOpenModal = (id: string, title: string) => {
    setSelectedProblem({ id, title });
    setIsModalOpen(true);
  };

  const handleSubmitFeedback = async (feedbackType: string) => {
    setIsFeedbackSubmitting(true);
    try {
      const res = await apiFetch<string>('/api/recommendations/feedback', {
        method: 'POST',
        body: JSON.stringify({ feedback: feedbackType }),
      });
      if (res.success) {
        setCurrentFeedback(feedbackType);
        setShowFeedbackOptions(false);
        toast.success('피드백이 반영되었습니다!');
      } else {
        toast.error('피드백 제출에 실패했습니다.');
      }
    } catch (e) {
      console.error('Failed to submit feedback:', e);
      toast.error('피드백 제출 중 오류가 발생했습니다.');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const FEEDBACK_OPTIONS = [
    { type: 'TOO_EASY', label: '쉬웠어요', icon: ThumbsDown, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
    { type: 'JUST_RIGHT', label: '적당해요', icon: ThumbsUp, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
    { type: 'TOO_HARD', label: '어려웠어요', icon: ThumbsDown, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30' },
  ];

  const buildStudyRoute = (studyId: number, problem: { externalId: string; title: string }) => {
    const aiRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const params = new URLSearchParams({
      fromAiRecommendation: 'true',
      aiExternalId: problem.externalId,
      aiProblemTitle: problem.title,
      aiRequestId,
    });
    return `/study/${studyId}?${params.toString()}`;
  };

  const loadStudies = async () => {
    setIsStudyLoading(true);
    setStudyLoadError(null);
    try {
      const response = await fetchMyStudies(0, '');
      setStudyList(response.content || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '스터디 목록을 불러오지 못했습니다.';
      setStudyLoadError(message);
      setStudyList([]);
    } finally {
      setIsStudyLoading(false);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const refreshStudiesUntilCreated = async (createdStudyId?: number) => {
    setIsStudyLoading(true);
    setStudyLoadError(null);
    setIsWaitingCreatedStudy(Boolean(createdStudyId));

    try {
      const maxAttempts = createdStudyId ? 15 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await fetchMyStudies(0, '');
        const nextList = response.content || [];
        setStudyList(nextList);

        if (!createdStudyId) {
          return true;
        }
        if (nextList.some((study) => study.id === createdStudyId)) {
          return true;
        }

        await sleep(600);
      }
      return false;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '스터디 목록을 불러오지 못했습니다.';
      setStudyLoadError(message);
      return false;
    } finally {
      setIsStudyLoading(false);
      setIsWaitingCreatedStudy(false);
    }
  };

  const handleOpenProblemLink = (problemId: string) => {
    const externalId = String(problemId || '').replace(/[^0-9]/g, '');
    if (!externalId) {
      toast.error('문제 번호를 확인할 수 없어 이동할 수 없습니다.');
      return;
    }
    window.open(`https://www.acmicpc.net/problem/${externalId}`, '_blank', 'noopener,noreferrer');
  };

  const handleSolveClick = async (problemId: string, title: string) => {
    const externalId = String(problemId || '').replace(/[^0-9]/g, '');
    if (!externalId) {
      toast.error('문제 번호를 확인할 수 없어 스터디에 추가할 수 없습니다.');
      return;
    }

    setSelectedStudyProblem({ externalId, title });
    setIsStudyModalOpen(true);
    await loadStudies();
  };

  const handleSelectStudy = (studyId: number) => {
    if (!selectedStudyProblem) return;
    setIsStudyModalOpen(false);
    router.push(buildStudyRoute(studyId, selectedStudyProblem));
  };

  const handleCreateStudySuccess = async (createdStudyId?: number) => {
    setIsCreateStudyOpen(false);
    setIsStudyModalOpen(true);

    const createdAppeared = await refreshStudiesUntilCreated(createdStudyId);
    if (!createdStudyId) {
      return;
    }

    if (createdAppeared) {
      return;
    }

    toast.warning('생성된 방 반영이 지연되고 있어요. 잠시 후 다시 선택해주세요.');
  };

  const handleOpenCreateStudy = () => {
    setIsStudyModalOpen(false);
    setIsCreateStudyOpen(true);
  };

  const handleStudyModalChange = (open: boolean) => {
    setIsStudyModalOpen(open);
    if (!open) {
      setStudyLoadError(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold text-foreground">AI 추천 문제</h3>
          <p className="text-xs text-muted-foreground">나에게 맞는 문제 추천</p>
        </div>
      </div>

      {/* 추천 문제 목록 */}
      <div className="space-y-4 h-full flex flex-col justify-center">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              AI가 문제를 생성 중이에요...
            </p>
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={handleRetry}
                disabled={!canRetry}
              >
                재요청
              </Button>
              {!canRetry && (
                <span className="text-[10px] text-muted-foreground">30초 후 활성화됩니다.</span>
              )}
            </div>
          </div>
        ) : data.length > 0 ? (
          data.map((item) => {
            const isTagOpen = openTagProblemId === item.problemId;

            return (
              <div
                key={item.problemId}
                className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                {/* 문제 정보 */}
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <span className="text-sm text-muted-foreground shrink-0">{item.problemId}</span>
                  <span className="text-sm font-semibold text-foreground truncate" title={item.title}>
                    {item.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${item.solved
                      ? 'bg-green-500/15 text-green-600 border border-green-500/30'
                      : 'bg-muted text-muted-foreground border border-border'
                      }`}
                  >
                    {item.solved ? '풀이 완료' : '미풀이'}
                  </span>
                </div>

                {/* 티어 & 태그 */}
                <div className="mb-4 relative overflow-visible">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 백준 티어 태그 */}
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold border text-muted-foreground shrink-0"
                      style={{
                        borderColor: BOJ_TIER_COLORS[item.tier] || '#828282',
                        color: BOJ_TIER_COLORS[item.tier] || '#828282',
                      }}
                    >
                      {BOJ_TIER_NAMES[item.tier] || 'Unknown'} {item.tierLevel}
                    </span>
                    {item.tags.length > 0 && (
                      <div className="relative inline-flex items-end">
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors"
                          onClick={() =>
                            setOpenTagProblemId((prev) =>
                              prev === item.problemId ? null : item.problemId,
                            )
                          }
                        >
                          {isTagOpen ? '태그 닫기' : '태그 보기'}
                        </button>

                        {isTagOpen && (
                          <div className="absolute left-[calc(100%+8px)] bottom-2 z-30 w-48 rounded-lg border border-border bg-background p-3 shadow-md">
                            <p className="font-semibold text-sm mb-2">포함된 태그</p>
                            <div className="flex flex-wrap content-start gap-1 h-23 overflow-y-auto">
                              {item.tags.map((tag) => (
                                <Badge
                                  key={`${item.problemId}-${tag}`}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 추천 이유 */}
                <p className="text-[15px] text-muted-foreground mb-4">💡 {item.reason}</p>

                {/* 버튼들 */}
                <div className="flex flex-col items-stretch gap-2">
                  <Button
                    className="h-8 w-full px-2.5 text-xs gap-1 bg-primary hover:bg-primary"
                    onClick={() =>
                      isMobile
                        ? handleOpenProblemLink(item.problemId)
                        : void handleSolveClick(item.problemId, item.title)
                    }
                  >
                    <ExternalLink className="w-3 h-3" />
                    {isMobile ? '문제 보러가기' : '풀러가기'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-full px-2.5 text-xs gap-1 border-border"
                    onClick={() => handleOpenModal(item.problemId, item.title)}
                  >
                    <Plus className="w-3 h-3" />
                    문제집에 추가
                  </Button>
                </div>

              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            추천할 수 있는 문제가 없습니다. <br /> 더 많은 문제를 풀어보세요!
          </div>
        )}

        {/* 피드백 섹션 */}
        {!showLoading && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          {isFeedbackLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : currentFeedback && !showFeedbackOptions ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  오늘의 피드백:
                  <span className={`ml-1 font-semibold ${
                    currentFeedback === 'TOO_EASY' ? 'text-blue-500' :
                    currentFeedback === 'JUST_RIGHT' ? 'text-green-500' :
                    'text-red-500'
                  }`}>
                    {currentFeedback === 'TOO_EASY' ? '쉬웠어요' :
                     currentFeedback === 'JUST_RIGHT' ? '적당해요' :
                     '어려웠어요'}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowFeedbackOptions(true)}
              >
                변경
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">오늘 추천 난이도는 어땠나요?</span>
              </div>
              <div className="flex gap-2">
                {FEEDBACK_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = currentFeedback === option.type;
                  return (
                    <Button
                      key={option.type}
                      variant="outline"
                      size="sm"
                      disabled={isFeedbackSubmitting}
                      className={`flex-1 h-9 text-xs gap-1.5 transition-all ${
                        isSelected ? `${option.bgColor} ${option.color} font-semibold` : 'border-border'
                      }`}
                      onClick={() => handleSubmitFeedback(option.type)}
                    >
                      {isFeedbackSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? option.color : ''}`} />
                      )}
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              {showFeedbackOptions && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowFeedbackOptions(false)}
                >
                  취소
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      </div>
      {selectedProblem && (
        <AddToWorkbookModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          problemBojId={selectedProblem.id}
          problemTitle={selectedProblem.title}
        />
      )}

      <Dialog open={isStudyModalOpen} onOpenChange={handleStudyModalChange}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>스터디방 선택</DialogTitle>
            <DialogDescription>
              선택한 스터디방에 문제를 추가하고 입장 페이지로 이동합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedStudyProblem && (
              <p className="text-sm text-muted-foreground">
                선택 문제: #{selectedStudyProblem.externalId} {selectedStudyProblem.title}
              </p>
            )}

            {isStudyLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {isWaitingCreatedStudy
                    ? '스터디방 생성 반영 중...'
                    : '스터디 목록 불러오는 중...'}
                </p>
              </div>
            ) : studyLoadError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {studyLoadError}
              </div>
            ) : studyList.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                참여 중인 스터디가 없습니다. 새 스터디를 만들어 진행해보세요.
              </div>
            ) : (
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {studyList.map((study) => (
                  <Button
                    key={study.id}
                    variant="outline"
                    className="h-auto w-full justify-start py-3 text-left"
                    onClick={() => handleSelectStudy(study.id)}
                  >
                    <div className="flex w-full flex-col gap-1">
                      <span className="text-sm font-semibold text-foreground">{study.title}</span>
                      <span className="text-xs text-muted-foreground">
                        멤버 {study.memberCount}명
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleStudyModalChange(false)}>
              취소
            </Button>
            <Button onClick={handleOpenCreateStudy} disabled={isStudyLoading}>
              스터디방 만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CCCreateStudyModal
        open={isCreateStudyOpen}
        onOpenChange={setIsCreateStudyOpen}
        onSuccess={handleCreateStudySuccess}
      />
    </div>
  );
};

export default AIRecommendation;
