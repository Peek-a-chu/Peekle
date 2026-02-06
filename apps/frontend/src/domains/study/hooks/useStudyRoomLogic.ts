import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import type { Problem } from '@/domains/study/types';
import { useStudyStore } from '@/domains/study/store/useStudyStore';
import { useStudyLayout } from './useStudyLayout';
import { useProblems } from './useProblems';
import { useProblemDates } from './useProblemDates';
import { useSubmissions } from './useSubmissions';
import { fetchStudyParticipants, fetchStudyRoom } from '../api/studyApi';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

export function useStudyRoomLogic() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;
  const { user, checkAuth } = useAuthStore();

  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentDate = useRoomStore((state) => state.setCurrentDate);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);

  // Global state for selected problem (used by CCCenterPanel for socket events)
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);

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
  const { problems, addProblem } = useProblems(Number(studyId));
  const { historyDates, refresh: refreshDates } = useProblemDates(Number(studyId));
  const { submissions, loadSubmissions } = useSubmissions(Number(studyId));

  const handleAddProblem = async (title: string, number: number, tags?: string[]) => {
    await addProblem(title, number, tags);
    await refreshDates(); // Refresh calendar dots
  };

  // Initialize room data (in real app, fetch from API)
  useEffect(() => {
    // Load user if not already available
    if (!user) {
      void checkAuth();
    }

    fetchStudyRoom(Number(studyId))
      .then((room) => {
        setRoomInfo({
          roomId: room.id,
          roomTitle: room.title,
        });
      })
      .catch((err) => console.error('Failed to fetch room info:', err));

    setCurrentDate(formatDate(new Date()));

    fetchStudyParticipants(Number(studyId))
      .then(setParticipants)
      .catch((err) => console.error('Failed to fetch participants:', err));

    if (user) {
      setCurrentUserId(user.id);
    }
  }, [studyId, setRoomInfo, setCurrentDate, setParticipants, setCurrentUserId, user]);

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

  const handleSelectProblem = (problem: Problem) => {
    const studyProblemId = (problem as any).id || (problem as any).studyProblemId;
    setSelectedProblem(studyProblemId, problem.problemId, problem.title, (problem as any).externalId);
    console.log('Selected problem:', problem.title);
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
    selectedStudyProblemId: useRoomStore.getState().selectedStudyProblemId ?? undefined,
    selectedProblemId: selectedProblemId ?? undefined,
    problems,
    historyDates,
    submissions,
    fetchSubmissions: loadSubmissions,
  };
}
