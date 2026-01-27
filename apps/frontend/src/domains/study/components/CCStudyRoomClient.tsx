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
import type { DailyProblem as Problem } from '@/domains/study/types';
import { fetchStudyParticipants, fetchStudyRoom } from '@/api/studyApi';
import { formatDate } from '@/lib/utils';

export function CCStudyRoomClient(): React.ReactNode {
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

  // Global state for selected problem
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);

  // API Hooks
  const { problems, addProblem, removeProblem } = useProblems(studyId, selectedDate);
  const { submissions, loadSubmissions } = useSubmissions(studyId);

  // Initialize room data (in real app, fetch from API)
  useEffect(() => {
    fetchStudyRoom(studyId)
      .then((data) =>
        setRoomInfo({
          roomId: data.id,
          roomTitle: data.title,
        }),
      )
      .catch((err) => console.error('Failed to fetch room info:', err));

    setCurrentDate(formatDate(new Date()));

    fetchStudyParticipants(studyId)
      .then((participants) =>
        setParticipants(
          participants.map((p) => ({
            id: p.userId,
            odUid: '', // Not available from static list
            nickname: p.nickname,
            isOwner: p.isOwner ?? false,
            isMuted: p.isMuted ?? false,
            isVideoOff: p.isVideoOff ?? false,
            isOnline: p.isOnline ?? false,
          })),
        ),
      )
      .catch((err) => console.error('Failed to fetch participants:', err));

    setCurrentUserId(1);
  }, [studyId, setRoomInfo, setCurrentDate, setParticipants, setCurrentUserId]);

  const handleBack = (): void => {
    router.push('/study');
  };

  const handleAddProblem = async (
    title: string,
    number: number,
    tags?: string[],
  ): Promise<void> => {
    await addProblem(title, number, tags);
    console.log('Add problem clicked in header');
  };

  const handleInvite = (): void => {
    setInviteModalOpen(true);
    console.log('Invite clicked');
  };

  const handleSettings = (): void => {
    setSettingsOpen(true);
    console.log('Settings clicked');
  };

  const handleWhiteboardClick = (): void => {
    console.log('Whiteboard clicked');
  };

  const handleSelectProblem = (problem: Problem): void => {
    setSelectedProblem(problem.problemId, problem.title);
  };

  const handleDateChange = (date: Date): void => {
    setSelectedDate(date);
    console.log('Date selected:', date);
  };

  const handleToggleLeftPanel = (): void => {
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
          selectedProblemId={selectedProblemId ?? undefined}
          onToggleFold={handleToggleLeftPanel}
          isFolded={isLeftPanelFolded}
          submissions={submissions}
          onFetchSubmissions={(problemId) => void loadSubmissions(problemId)}
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
