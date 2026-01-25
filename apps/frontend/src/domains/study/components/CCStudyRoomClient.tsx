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
import { fetchStudyParticipants, fetchStudyRoom } from '@/app/api/studyApi';
import { formatDate } from '@/lib/utils';

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
    fetchStudyRoom(studyId)
      .then(setRoomInfo)
      .catch((err) => console.error('Failed to fetch room info:', err));

    setCurrentDate(formatDate(new Date()));

    fetchStudyParticipants(studyId)
      .then(setParticipants)
      .catch((err) => console.error('Failed to fetch participants:', err));

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
