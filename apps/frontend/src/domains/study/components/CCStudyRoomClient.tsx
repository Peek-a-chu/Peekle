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
// import { WhiteboardOverlay } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useWhiteboardSocket } from '@/domains/study/hooks/useWhiteboardSocket';
import dynamic from 'next/dynamic';

import { SocketProvider } from '@/domains/study/context/SocketContext';

const WhiteboardOverlay = dynamic(
  () =>
    import('@/domains/study/components/whiteboard/WhiteboardOverlay').then(
      (mod) => mod.WhiteboardOverlay,
    ),
  { ssr: false },
);

// Inner component with main logic
function StudyRoomContent({ studyId }: { studyId: number }) {
  const router = useRouter();

  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  // Ensure we set roomId immediately to store if possible
  // Although useEffect below does it, React render might happen before useEffect runs?
  // No, but children (StudyChatPanel) uses useRoomStore(state => state.roomId).
  // If we don't set it, it defaults to 0.
  // Let's set it in a LayoutEffect or Initializer if possible, but useEffect is standard.
  // The fix in CCStudyRoomClient.tsx (adding immediate set in useEffect) should help,
  // but better to pass studyId as prop to StudyChatPanel via context or props if possible.
  // However, StudyChatPanel reads from Store.

  // We can also initialize store with props?
  useEffect(() => {
    if (studyId) setRoomInfo({ roomId: studyId, roomTitle: '' });
  }, [studyId, setRoomInfo]);

  const setCurrentDate = useRoomStore((state) => state.setCurrentDate);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);

  // Whiteboard State
  const setIsWhiteboardActive = useRoomStore((state) => state.setIsWhiteboardActive);
  const setWhiteboardOpenedBy = useRoomStore((state) => state.setWhiteboardOpenedBy);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);

  // Whiteboard Socket Logic
  const { sendMessage } = useWhiteboardSocket(String(studyId), (msg) => {
    if (msg.action === 'START') {
      setIsWhiteboardActive(true);
      setWhiteboardOpenedBy(msg.senderName || 'Anonymous');
    }
    if (msg.action === 'CLOSE') {
      setIsWhiteboardActive(false);
      setWhiteboardOverlayOpen(false);
    }
    if (msg.action === 'SYNC') {
      if (msg.data && msg.data.isActive) {
        setIsWhiteboardActive(true);
        // Note: msg.data.ownerId might be available
      }
    }
  });

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
    // Ensure roomId is set in store immediately when studyId is available
    if (studyId) {
      setRoomInfo({ roomId: studyId, roomTitle: `Loading...` });
    }

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
    if (isWhiteboardActive) {
      setWhiteboardOverlayOpen(true);
    } else {
      sendMessage({ action: 'START' });
      // Optimistically open and activate for the initiator
      setIsWhiteboardActive(true);
      setWhiteboardOverlayOpen(true);
    }
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
    <>
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
        centerPanel={
          <CenterPanel
            onWhiteboardClick={handleWhiteboardClick}
            onWhiteboardToggle={handleWhiteboardClick}
          />
        }
        rightPanel={<RightPanel onFold={() => setIsRightPanelFolded(true)} />}
        isLeftPanelFolded={isLeftPanelFolded}
        onUnfoldLeftPanel={handleToggleLeftPanel}
        isRightPanelFolded={isRightPanelFolded}
        onUnfoldRightPanel={() => setIsRightPanelFolded(false)}
      />
      <WhiteboardOverlay />
    </>
  );
}

// Wrapper to provide SocketContext
export function CCStudyRoomClient(): React.ReactNode {
  const params = useParams();
  const studyId = Number(params.id) || 0;
  const currentUserId = useRoomStore((state) => state.currentUserId);

  // Wait for userId to be initialized if you want to delay connection?
  // But we want to render the content immediately.
  // SocketProvider will handle connection updates when currentUserId changes.

  return (
    <SocketProvider roomId={studyId} userId={currentUserId}>
      <StudyRoomContent studyId={studyId} />
    </SocketProvider>
  );
}
