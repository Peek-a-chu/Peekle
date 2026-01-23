import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudyStore } from '@/domains/study/store/useStudyStore';
import { useStudyLayout } from './useStudyLayout';
import { useProblems } from './useProblems';
import { useProblemDates } from './useProblemDates';
import { useSubmissions } from './useSubmissions';

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

export function useStudyRoomLogic() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;

  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentDate = useRoomStore((state) => state.setCurrentDate);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);

  // Global state for selected date
  const selectedDate = useStudyStore((state) => state.selectedDate);
  const setSelectedDate = useStudyStore((state) => state.setSelectedDate);

  // Use custom hook for panel state
  const {
    isLeftPanelFolded,
    isRightPanelFolded,
    toggleLeftPanel,
    unfoldLeftPanel,
    unfoldRightPanel,
    foldRightPanel,
  } = useStudyLayout();

  // Load problems using real API
  const { problems, addProblem, refresh: refreshProblems } = useProblems(Number(studyId), selectedDate);
  const { historyDates, refresh: refreshDates } = useProblemDates(Number(studyId));
  const { submissions, loadSubmissions } = useSubmissions(Number(studyId));

  const handleAddProblem = async (title: string, number: number, tags?: string[]) => {
    await addProblem(title, number, tags);
    await refreshDates(); // Refresh calendar dots
  };

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



  const handleInvite = () => {
    setInviteModalOpen(true);
    console.log('Invite clicked');
  };

  const handleSettings = () => {
    setSettingsOpen(true);
    console.log('Settings clicked');
  };

  const handleSelectProblem = (problemId: number) => {
    console.log('Selected problem:', problemId);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    console.log('Date selected:', date);
  };

  return {
    isLeftPanelFolded,
    isRightPanelFolded,
    toggleLeftPanel,
    unfoldLeftPanel,
    unfoldRightPanel,
    foldRightPanel,
    handleBack,
    handleAddProblem,
    handleInvite,
    handleSettings,
    handleSelectProblem,
    handleDateChange,
    selectedDate,
    problems,
    historyDates,
    submissions,
    fetchSubmissions: loadSubmissions,
  };
}
