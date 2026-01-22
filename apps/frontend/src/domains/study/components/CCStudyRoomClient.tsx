'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import {
  StudyHeader,
  ProblemListPanel,
  CenterPanel,
  RightPanel,
} from '@/domains/study/components';

// Mock problems with dates
const MOCK_PROBLEMS = [
  {
    id: 1,
    title: '1753 최단경로',
    source: '백준 1753',
    status: 'in_progress' as const,
    solvedDate: new Date(),
    tags: ['bfs', '다이나믹 프로그래밍'],
    participantCount: 2,
    totalParticipants: 4,
    url: 'https://www.acmicpc.net/problem/1753',
  },
  {
    id: 2,
    title: '1753 스도쿠',
    source: '백준 1753',
    status: 'completed' as const,
    solvedDate: new Date(Date.now() - 86400000),
    tags: ['bfs', '다이나믹 프로그래밍'],
    participantCount: 2,
    totalParticipants: 4,
    url: 'https://www.acmicpc.net/problem/1753',
  },
  {
    id: 3,
    title: '1753 최단경로',
    source: '백준 11657',
    status: 'not_started' as const,
    solvedDate: new Date(),
    tags: ['bfs', '다이나믹 프로그래밍'],
    participantCount: 0,
    totalParticipants: 4,
    url: 'https://www.acmicpc.net/problem/1753',
  },
];

// Mock data for demo
const MOCK_PARTICIPANTS = [
  {
    id: 1,
    odUid: 'user1',
    nickname: '알고마스터',
    isOwner: true,
    isMuted: false,
    isVideoOff: false,
    isOnline: true,
    lastSpeakingAt: Date.now() - 1000,
  },
  {
    id: 2,
    odUid: 'user2',
    nickname: 'CodeNinja',
    isOwner: false,
    isMuted: false,
    isVideoOff: false,
    isOnline: true,
    lastSpeakingAt: Date.now() - 5000,
  },
  {
    id: 3,
    odUid: 'user3',
    nickname: 'PS러버',
    isOwner: false,
    isMuted: true,
    isVideoOff: false,
    isOnline: true,
    lastSpeakingAt: Date.now() - 10000,
  },
  {
    id: 4,
    odUid: 'user4',
    nickname: '백준킹',
    isOwner: false,
    isMuted: true,
    isVideoOff: true,
    isOnline: false,
  },
];

function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

interface StudyLayoutContentProps {
  header: ReactNode;
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  isLeftPanelFolded: boolean;
  onUnfoldLeftPanel: () => void;
  isRightPanelFolded: boolean;
  onUnfoldRightPanel: () => void;
  className?: string;
}

function StudyLayoutContent({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  isLeftPanelFolded,
  onUnfoldLeftPanel,
  isRightPanelFolded,
  onUnfoldRightPanel,
  className,
}: StudyLayoutContentProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <header className="shrink-0 border-b border-border">{header}</header>

      {/* Main Content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left Panel - Animation handled by width */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-all duration-300 ease-in-out',
            isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : 'w-64',
          )}
        >
          <div className="w-64 h-full">
            {/* Inner container to maintain width during transition */}
            {leftPanel}
          </div>
        </aside>

        {/* Center Panel */}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col transition-all duration-300',
            isLeftPanelFolded && 'pl-12',
            isRightPanelFolded && 'pr-12',
          )}
        >
          {/* Unfold Left Panel Button - Visible only when left folded */}
          {isLeftPanelFolded && (
            <div className="absolute left-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldLeftPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="문제 목록 펼치기"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Unfold Right Panel Button - Visible only when right folded */}
          {isRightPanelFolded && (
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldRightPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="채팅/참여자 펼치기"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {centerPanel}
        </main>

        {/* Right Panel */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-card transition-all duration-300 ease-in-out',
            isRightPanelFolded ? 'w-0 border-l-0 overflow-hidden' : 'w-80',
          )}
        >
          <div className="w-80 h-full">{rightPanel}</div>
        </aside>
      </div>
    </div>
  );
}

export function CCStudyRoomClient() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;

  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentDate = useRoomStore((state) => state.setCurrentDate);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);

  // Local state for layout
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLeftPanelFolded, setIsLeftPanelFolded] = useState(false);
  const [isRightPanelFolded, setIsRightPanelFolded] = useState(false);

  // Initialize room data (in real app, fetch from API)
  useEffect(() => {
    setRoomInfo({
      roomId: Number(studyId),
      roomTitle: '알고리즘 마스터 스터디',
      roomDescription: '매주 월/수/금 알고리즘 문제를 함께 풀어요!',
      inviteCode: 'ABC123',
    });
    setCurrentDate(formatDate(new Date()));
    setParticipants(MOCK_PARTICIPANTS);
    setCurrentUserId(1);
  }, [studyId, setRoomInfo, setCurrentDate, setParticipants, setCurrentUserId]);

  const handleBack = () => {
    router.push('/study');
  };

  const handleAddProblem = () => {
    console.log('Add problem clicked');
  };

  const handleInvite = () => {
    setInviteModalOpen(true);
    console.log('Invite clicked');
  };

  const handleSettings = () => {
    setSettingsOpen(true);
    console.log('Settings clicked');
  };

  const handleWhiteboardClick = () => {
    console.log('Whiteboard clicked');
  };

  const handleSelectProblem = (problemId: number) => {
    console.log('Selected problem:', problemId);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    console.log('Date selected:', date);
  };

  const handleToggleLeftPanel = () => {
    setIsLeftPanelFolded(!isLeftPanelFolded);
  };

  return (
    <StudyLayoutContent
      header={
        <StudyHeader
          onBack={handleBack}
          onAddProblem={handleAddProblem}
          onInvite={handleInvite}
          onSettings={handleSettings}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      }
      leftPanel={
        <ProblemListPanel
          problems={MOCK_PROBLEMS}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onAddProblem={handleAddProblem}
          onSelectProblem={handleSelectProblem}
          onToggleFold={handleToggleLeftPanel}
          isFolded={isLeftPanelFolded}
        />
      }
      centerPanel={<CenterPanel onWhiteboardClick={handleWhiteboardClick} />}
      rightPanel={<RightPanel onFold={() => setIsRightPanelFolded(true)} />}
      isLeftPanelFolded={isLeftPanelFolded}
      onUnfoldLeftPanel={handleToggleLeftPanel}
      isRightPanelFolded={isRightPanelFolded}
      onUnfoldRightPanel={() => setIsRightPanelFolded(false)}
    />
  );
}
