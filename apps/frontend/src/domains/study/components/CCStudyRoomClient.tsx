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
import { fetchStudyParticipants, fetchStudyRoom } from '../api/studyApi';
import { formatDate } from '@/lib/utils';
import { useWhiteboardSocket } from '@/domains/study/hooks/useWhiteboardSocket';
import { SocketProvider } from '@/domains/study/context/SocketContext';
import { useAuthStore } from '@/store/auth-store';
import {
  useStudySocketActions,
  useStudySocketSubscription,
} from '@/domains/study/hooks/useStudySocket';

// Inner component with main logic
function StudyRoomContent({ studyId }: { studyId: number }) {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  // Listen for participant events and Handle Enter/Leave
  useStudySocketSubscription(studyId);
  const { updateStatus } = useStudySocketActions();

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
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);

  useEffect(() => {
    // Reset selected problem and view mode when mounting study room
    console.log('[StudyRoomClient] Mounting/Effect trigger');
    // DISABLED AUTO-RESET: Suspected cause of "No Problem Selected" bug
    // setSelectedProblem(null, null);
    resetToOnlyMine();
  }, [setSelectedProblem, resetToOnlyMine]);

  // API Hooks
  const { problems, addProblem, deleteProblem } = useProblems(studyId);
  const { submissions, loadSubmissions } = useSubmissions(studyId);

  // Initialize room data (in real app, fetch from API)
  useEffect(() => {
    // Load user if not already available
    if (!user) {
      void checkAuth();
    }

    // Ensure roomId is set in store immediately when studyId is available
    if (studyId) {
      setRoomInfo({ roomId: studyId, roomTitle: `Loading...` });
    }

    fetchStudyRoom(studyId)
      .then((data) =>
        setRoomInfo({
          roomId: data.id,
          roomTitle: data.title,
          myRole: data.role,
        }),
      )
      .catch((err) => console.error('Failed to fetch room info:', err));

    setCurrentDate(formatDate(new Date()));

    fetchStudyParticipants(studyId)
      .then((participants) =>
        setParticipants(
          participants.map((p) => ({
            id: Number(p.userId),
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

    if (user) {
      setCurrentUserId(user.id);
    }
  }, [studyId, setRoomInfo, setCurrentDate, setParticipants, setCurrentUserId, user]);

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

  const handleMicToggle = (): void => {
    // Determine new state based on simple toggle
    // However, ControlBar is stateless now and relies on Store.
    // So we invoke updateStatus with inverted current state
    const { currentUserId, participants, updateParticipant } = useRoomStore.getState();
    const me = participants.find((p) => p.id === currentUserId);
    if (!me || !currentUserId) return;

    // Optimistic Update
    const newMuted = !me.isMuted;
    updateParticipant(currentUserId, { isMuted: newMuted });

    // Toggle Mute
    updateStatus(newMuted, me.isVideoOff);
  };

  const handleVideoToggle = (): void => {
    const { currentUserId, participants, updateParticipant } = useRoomStore.getState();
    const me = participants.find((p) => p.id === currentUserId);
    if (!me || !currentUserId) return;

    // Optimistic Update
    const newVideoOff = !me.isVideoOff;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });

    // Toggle Video
    updateStatus(me.isMuted, newVideoOff);
  };

  // Control Bar button: Toggle whiteboard tile visibility in VideoGrid
  const handleWhiteboardToggle = (): void => {
    if (isWhiteboardActive) {
      // Turn off whiteboard - send CLOSE message
      sendMessage({ action: 'CLOSE' });
      setIsWhiteboardActive(false);
      setWhiteboardOverlayOpen(false);
    } else {
      // Turn on whiteboard - send START message
      sendMessage({ action: 'START' });
      setIsWhiteboardActive(true);
    }
  };

  // VideoGrid tile click: handled directly in WhiteboardTile component
  const handleWhiteboardClick = (): void => {
    // No-op: WhiteboardTile handles the toggle internally
  };

  const handleSelectProblem = (problem: Problem): void => {
    console.log('[StudyRoomClient] Selecting problem:', problem);
    // Ensure ID is a valid number
    const pId = Number(problem.problemId);
    if (!pId) {
      console.warn('[StudyRoomClient] Invalid problem ID:', problem.problemId);
      return;
    }
    setSelectedProblem(pId, problem.title);
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
            problems={problems.map((p: any) => ({
              ...p,
              problemId: p.id ?? p.problemId,
              solvedMemberCount: p.solvedMemberCount ?? 0,
            }))}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onAddProblem={addProblem}
            onRemoveProblem={deleteProblem}
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
            onMicToggle={handleMicToggle}
            onVideoToggle={handleVideoToggle}
            onWhiteboardToggle={handleWhiteboardToggle}
            onSettingsClick={handleSettings}
          />
        }
        rightPanel={<RightPanel onFold={() => setIsRightPanelFolded(true)} />}
        isLeftPanelFolded={isLeftPanelFolded}
        onUnfoldLeftPanel={handleToggleLeftPanel}
        isRightPanelFolded={isRightPanelFolded}
        onUnfoldRightPanel={() => setIsRightPanelFolded(false)}
      />
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
    <SocketProvider roomId={studyId} userId={currentUserId ?? 0}>
      <StudyRoomContent studyId={studyId} />
    </SocketProvider>
  );
}
