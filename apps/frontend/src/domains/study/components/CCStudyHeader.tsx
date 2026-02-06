'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStudyHeader } from '@/domains/study/hooks/useStudyHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Copy, Settings } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCInviteModal } from './CCInviteModal';
import { CCStudySettingsModal } from './CCStudySettingsModal';

interface CCStudyHeaderProps {
  onBack?: () => void;
  onAddProblem?: (title: string, number: number, tags?: string[]) => Promise<void>;
  onInvite?: () => void;
  onSettings?: () => void;
  className?: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function CCStudyHeader({
  onBack,
  onInvite,
  onSettings,
  className,
}: CCStudyHeaderProps): React.ReactElement {
  const { roomTitle, whiteboardMessage, isWhiteboardActive, isOwner } = useStudyHeader();

  const isInviteModalOpen = useRoomStore((state) => state.isInviteModalOpen);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const isSettingsOpen = useRoomStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [guideSteps, setGuideSteps] = useState<
    { id: string; title: string; description: string; selector: string }[]
  >([]);
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const allGuideSteps = useMemo(
    () => [
      {
        id: 'manual',
        title: '스터디 매뉴얼',
        description: '이 버튼을 누르면 언제든 기능 가이드를 다시 볼 수 있어요.',
        selector: '[data-tour=\"manual-button\"]',
      },
      {
        id: 'problem-list',
        title: '문제 목록',
        description: '날짜별 문제를 확인하고, 문제를 선택해 풀이를 시작할 수 있어요.',
        selector: '[data-tour=\"problem-list\"]',
      },
      {
        id: 'video-grid',
        title: '화상 타일',
        description: '스터디 참여자들의 영상 타일입니다. 클릭하면 코드 보기로 전환돼요.',
        selector: '[data-tour=\"video-grid\"]',
      },
      {
        id: 'ide',
        title: '코드 에디터',
        description: '문제 풀이를 하는 핵심 영역입니다. 선택한 문제의 코드를 작성해요.',
        selector: '[data-tour=\"ide-panel\"]',
      },
      {
        id: 'ide-language',
        title: '언어 선택',
        description: '풀이 언어를 선택할 수 있어요.',
        selector: '[data-tour=\"ide-language\"]',
      },
      {
        id: 'ide-theme',
        title: '테마 변경',
        description: '라이트/다크 테마를 전환할 수 있어요.',
        selector: '[data-tour=\"ide-theme-toggle\"]',
      },
      {
        id: 'ide-copy',
        title: '코드 복사',
        description: '현재 코드를 클립보드에 복사해요.',
        selector: '[data-tour=\"ide-copy\"]',
      },
      {
        id: 'ide-ref-chat',
        title: '코드 참조',
        description: '현재 코드를 채팅으로 공유할 수 있어요.',
        selector: '[data-tour=\"ide-ref-chat\"]',
      },
      {
        id: 'ide-submit',
        title: '제출',
        description: '현재 문제를 자동 제출합니다.',
        selector: '[data-tour=\"ide-submit\"]',
      },
      {
        id: 'ide-viewmode',
        title: '다른 코드 열람',
        description: '다른 사람의 코드를 보는 중임을 표시합니다.',
        selector: '[data-tour=\"ide-viewmode-banner\"]',
      },
      {
        id: 'ide-reset',
        title: '내 코드만 보기',
        description: '다른 코드 보기에서 내 코드 화면으로 돌아갑니다.',
        selector: '[data-tour=\"ide-reset-view\"]',
      },
      {
        id: 'control-bar',
        title: '컨트롤 바',
        description: '마이크/카메라/화이트보드 등 주요 기능을 제어할 수 있어요.',
        selector: '[data-tour=\"control-bar\"]',
      },
      {
        id: 'chat',
        title: '채팅',
        description: '실시간 채팅과 코드 공유가 가능한 탭이에요.',
        selector: '[data-tour=\"chat-tab\"]',
      },
      {
        id: 'participants',
        title: '참여자',
        description: '현재 참여 중인 사용자와 온라인 상태를 확인할 수 있어요.',
        selector: '[data-tour=\"participants-tab\"]',
      },
      {
        id: 'invite',
        title: '초대하기',
        description: '스터디 링크를 복사해서 팀원을 초대할 수 있어요.',
        selector: '[data-tour=\"invite-button\"]',
      },
      {
        id: 'settings',
        title: '스터디 설정',
        description: '방장만 보이는 설정 버튼입니다. 스터디 정보를 관리할 수 있어요.',
        selector: '[data-tour=\"settings-button\"]',
      },
    ],
    [],
  );

  useEffect(() => {
    if (!isGuideOpen) return;
    const available = allGuideSteps.filter((step) => {
      if (typeof document === 'undefined') return false;
      return Boolean(document.querySelector(step.selector));
    });
    setGuideSteps(available.length ? available : allGuideSteps);
    setGuideStepIndex(0);
  }, [isGuideOpen, allGuideSteps]);

  useEffect(() => {
    if (!isGuideOpen) return;

    const updateSpotlight = () => {
      const step = guideSteps[guideStepIndex];
      if (!step || typeof document === 'undefined') {
        setSpotlightRect(null);
        return;
      }
      const element = document.querySelector(step.selector) as HTMLElement | null;
      if (!element) {
        setSpotlightRect(null);
        return;
      }
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      const rect = element.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateSpotlight();

    const handleResize = () => updateSpotlight();
    const handleScroll = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      document.body.style.overflow = '';
    };
  }, [isGuideOpen, guideStepIndex, guideSteps]);

  const activeStep = guideSteps[guideStepIndex];
  const totalSteps = guideSteps.length || 1;

  return (
    <div className={cn('flex h-14 items-center justify-between px-4', className)}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로 가기">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold">{roomTitle}</h1>

        <div className="mx-2 h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsGuideOpen(true)}
          data-tour="manual-button"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-semibold">
            ?
          </span>
          스터디 매뉴얼
        </Button>
      </div>

      {/* Center Section - Whiteboard Message */}
      {isWhiteboardActive && whiteboardMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-sm">
          {whiteboardMessage}
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onInvite}
          className="gap-2 font-normal"
          data-tour="invite-button"
        >
          <Copy className="h-4 w-4" />
          초대하기
        </Button>

        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="gap-2 font-normal"
            title="스터디 설정"
            data-tour="settings-button"
          >
            <Settings className="h-4 w-4" />
            스터디 설정
          </Button>
        )}
      </div>

      {/* Modals */}
      <CCInviteModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <CCStudySettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />

      {isGuideOpen && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsGuideOpen(false)}
          />
          {spotlightRect && (
            <div
              className="absolute rounded-xl ring-2 ring-white/90"
              style={{
                top: Math.max(0, spotlightRect.top - 6),
                left: Math.max(0, spotlightRect.left - 6),
                width: spotlightRect.width + 12,
                height: spotlightRect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              }}
            />
          )}

          {activeStep && spotlightRect && (
            <div
              className="absolute rounded-xl border border-border bg-card/95 p-4 shadow-xl"
              style={{
                top:
                  spotlightRect.top + spotlightRect.height + 16 + 160 >
                  (typeof window !== 'undefined' ? window.innerHeight : 0)
                    ? Math.max(16, spotlightRect.top - 180)
                    : spotlightRect.top + spotlightRect.height + 16,
                left: Math.min(
                  Math.max(16, spotlightRect.left + spotlightRect.width / 2 - 160),
                  (typeof window !== 'undefined' ? window.innerWidth : 0) - 336,
                ),
                width: 320,
              }}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {guideStepIndex + 1} / {totalSteps}
              </div>
              <div className="text-sm font-semibold">{activeStep.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{activeStep.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGuideOpen(false)}
                >
                  닫기
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuideStepIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={guideStepIndex === 0}
                  >
                    이전
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (guideStepIndex >= totalSteps - 1) {
                        setIsGuideOpen(false);
                      } else {
                        setGuideStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
                      }
                    }}
                  >
                    {guideStepIndex >= totalSteps - 1 ? '완료' : '다음'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
