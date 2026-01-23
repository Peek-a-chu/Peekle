'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCStudyHeader as StudyHeader } from './CCStudyHeader';
import { CCProblemListPanel as ProblemListPanel } from './CCProblemListPanel';
import { CCCenterPanel as CenterPanel } from './CCCenterPanel';
import { CCRightPanel as RightPanel } from './CCRightPanel';
import { StudyLayoutContent } from './StudyLayoutContent';
import { useProblems } from '@/domains/study/hooks/useProblems';
import { useSubmissions } from '@/domains/study/hooks/useSubmissions';

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

export function CCStudyRoomClient() {
  const params = useParams();
  const router = useRouter();
  const studyId = Number(params.id) || 0;

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
  const [selectedProblemId, setSelectedProblemId] = useState<number | undefined>(undefined);

  // API Hooks
  const { problems, addProblem, removeProblem } = useProblems(studyId, selectedDate);
  const { submissions, loadSubmissions } = useSubmissions(studyId);

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

  const handleAddProblem = async (title: string, number: number, tags?: string[]) => {
    await addProblem(title, number, tags);
    console.log('Add problem clicked in header');
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
    setSelectedProblemId(problemId);
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
          problems={problems}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onAddProblem={addProblem}
          onRemoveProblem={removeProblem}
          onSelectProblem={handleSelectProblem}
          selectedProblemId={selectedProblemId}
          onToggleFold={handleToggleLeftPanel}
          isFolded={isLeftPanelFolded}
          submissions={submissions}
          onFetchSubmissions={loadSubmissions}
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
