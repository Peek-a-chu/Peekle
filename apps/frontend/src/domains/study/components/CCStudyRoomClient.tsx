'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Loader2 } from 'lucide-react';
import { CCStudyHeader as StudyHeader } from './CCStudyHeader';
import { CCProblemListPanel as ProblemListPanel } from './CCProblemListPanel';
import { CCCenterPanel as CenterPanel } from './CCCenterPanel';
import { CCVideoGrid as VideoGrid } from './CCVideoGrid';
import { CCRightPanel as RightPanel } from './CCRightPanel';
import { StudyLayoutContent } from './StudyLayoutContent';
import { useProblems } from '@/domains/study/hooks/useProblems';
import { useSubmissions } from '@/domains/study/hooks/useSubmissions';
import type { DailyProblem as Problem } from '@/domains/study/types';
import { fetchStudyParticipants, fetchStudyRoom } from '../api/studyApi';
import { format } from 'date-fns';
import { formatDate } from '@/lib/utils';
import { useWhiteboardSocket } from '@/domains/study/hooks/useWhiteboardSocket';
import { SocketProvider } from '@/domains/study/context/SocketContext';
import { useAuthStore } from '@/store/auth-store';
import {
  useStudySocketActions,
  useStudySocketSubscription,
} from '@/domains/study/hooks/useStudySocket';
import SettingsModal from '@/domains/settings/components/SettingsModal';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import { useLocalParticipant } from '@livekit/components-react';
import { CCPreJoinModal } from '@/components/common/CCPreJoinModal';
import { CCLiveKitWrapper } from './CCLiveKitWrapper';
import { useStudyPresenceSync } from '@/domains/study/hooks/useStudyPresenceSync';

function StudySocketInitiator({ studyId }: { studyId: number }) {
  const { user, checkAuth } = useAuthStore();
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);

  // 1. Ensure Auth & Sync User ID
  useEffect(() => {
    if (!user) {
      void checkAuth();
    }
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user, checkAuth, setCurrentUserId]);

  // 2. Manage Socket Subscription (This will connect socket -> send Enter -> get Token)
  useStudySocketSubscription(studyId);

  return null;
}

// Inner component with main logic
function StudyRoomContent({ studyId }: { studyId: number }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  useStudyPresenceSync();

  // Listen for participant events and Handle Enter/Leave
  // MOVED TO StudySocketInitiator
  // useStudySocketSubscription(studyId);   <-- REMOVED
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
    if (studyId) setRoomInfo({ roomId: studyId });
  }, [studyId, setRoomInfo]);

  const setCurrentDate = useRoomStore((state) => state.setCurrentDate);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const updateParticipant = useRoomStore((state) => state.updateParticipant);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);
  const openSettingsModal = useSettingsStore((state) => state.openModal);

  // [Fix] Move device settings modal open logic to after successful join or remove auto-open if causing issues on redirect.
  const [isJoined, setIsJoined] = useState(false);

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
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [compactTab, setCompactTab] = useState<'problems' | 'ide'>('problems');

  // Global state for selected problem
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);
  const lastSelectedProblemStorageKey = `peekle:study:${studyId}:last-selected-problem`;

  useEffect(() => {
    // Reset selected problem and view mode when mounting study room
    // DISABLED AUTO-RESET: Suspected cause of "No Problem Selected" bug
    // setSelectedProblem(null, null);
    resetToOnlyMine();
  }, [setSelectedProblem, resetToOnlyMine]);

  // [Fix] Sync Local Media State with Store (Address Entry Sync Issue)
  useEffect(() => {
    // Wait for user and participants to be loaded
    if (!currentUserId || !localParticipant) return;

    // Determine Real State
    const realIsMuted = !isMicrophoneEnabled;
    const realIsVideoOff = !isCameraEnabled;

    // If Store State differs from Real State, update Store
    const currentParticipants = useRoomStore.getState().participants;
    const me = currentParticipants.find((p) => p.id === currentUserId);

    if (me && (me.isMuted !== realIsMuted || me.isVideoOff !== realIsVideoOff)) {
      console.log('[MediaSync] Syncing store to match local device', {
        storeMuted: me.isMuted,
        realMuted: realIsMuted,
        storeVideo: me.isVideoOff,
        realVideo: realIsVideoOff
      });
      updateParticipant(currentUserId, { isMuted: realIsMuted, isVideoOff: realIsVideoOff });
      // Also notify server via socket
      updateStatus(realIsMuted, realIsVideoOff);
    }
  }, [
    currentUserId,
    // Removed participants dependency to prevent infinite loop
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    updateParticipant,
    updateStatus,
  ]);

  // API Hooks
  const { problems, addProblem, deleteProblem } = useProblems(
    studyId,
    format(selectedDate, 'yyyy-MM-dd'),
  );
  const { submissions, loadSubmissions } = useSubmissions(studyId);

  // Initialize room data (fetch participants only, room info fetched in wrapper)
  useEffect(() => {
    // Access is guaranteed by wrapper
    // Access is guaranteed by wrapper

    setCurrentDate(formatDate(new Date()));

    fetchStudyParticipants(studyId)
      .then((participants) => {
        const current = useRoomStore.getState().participants;
        const currentMap = new Map(current.map((p) => [p.id, p]));
        setParticipants(
          participants.map((p) => {
            const id = Number(p.id);
            const existing = currentMap.get(id);
            return {
              ...p,
              id,
              isOwner: p.isOwner ?? existing?.isOwner ?? false,
              isMuted: existing?.isMuted ?? p.isMuted ?? false,
              isVideoOff: existing?.isVideoOff ?? p.isVideoOff ?? false,
              isOnline: Boolean(existing?.isOnline) || Boolean(p.isOnline),
            };
          }),
        );
      })
      .catch((err) => console.error('Failed to fetch participants:', err));
  }, [studyId, setCurrentDate, setParticipants, user]);

  const handleBack = (): void => {
    router.push('/study');
  };

  const handleAddProblem = async (
    title: string,
    number: number,
    tags?: string[],
    problemId?: number,
  ): Promise<void> => {
    await addProblem(title, number, tags, problemId, format(selectedDate, 'yyyy-MM-dd'));
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

  const handleMicToggle = async (): Promise<void> => {
    if (localParticipant) {
      try {
        const targetEnabled = !localParticipant.isMicrophoneEnabled;
        await localParticipant.setMicrophoneEnabled(targetEnabled);

        const { currentUserId, updateParticipant } = useRoomStore.getState();
        if (currentUserId) {
          updateParticipant(currentUserId, { isMuted: !targetEnabled });
          const { participants } = useRoomStore.getState();
          const me = participants.find((p) => p.id === currentUserId);
          updateStatus(!targetEnabled, me?.isVideoOff ?? false);
        }
      } catch (error) {
        console.warn('Mic toggle error:', error);
        toast.error('마이크를 켤 수 없습니다.', {
          description: '설정에서 장치 권한을 확인하거나 다시 선택해주세요.',
          action: {
            label: '설정 열기',
            onClick: () => useSettingsStore.getState().openModal('device'),
          },
        });
        // Open modal automatically if permission error is suspected
        if (
          error instanceof Error &&
          (error.name === 'NotAllowedError' || error.message.includes('Permission denied'))
        ) {
          useSettingsStore.getState().openModal('device');
        }
      }
    }
  };

  const handleVideoToggle = async (): Promise<void> => {
    if (localParticipant) {
      try {
        const targetEnabled = !localParticipant.isCameraEnabled;
        await localParticipant.setCameraEnabled(targetEnabled);

        const { currentUserId, updateParticipant } = useRoomStore.getState();
        if (currentUserId) {
          updateParticipant(currentUserId, { isVideoOff: !targetEnabled });
          const { participants } = useRoomStore.getState();
          const me = participants.find((p) => p.id === currentUserId);
          updateStatus(me?.isMuted ?? false, !targetEnabled);
        }
      } catch (error) {
        console.warn('Camera toggle error:', error);
        toast.error('카메라를 켤 수 없습니다.', {
          description: '설정에서 장치 권한을 확인하거나 다시 선택해주세요.',
          action: {
            label: '설정 열기',
            onClick: () => useSettingsStore.getState().openModal('device'),
          },
        });
        if (
          error instanceof Error &&
          (error.name === 'NotAllowedError' || error.message.includes('Permission denied'))
        ) {
          useSettingsStore.getState().openModal('device');
        }
      }
    }
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
      setWhiteboardOverlayOpen(true);
    }
  };

  // VideoGrid tile click: handled directly in WhiteboardTile (only toggles overlay)
  const handleWhiteboardClick = (): void => {
    // [Fix] Tile click should NOT toggle the global whiteboard session (isWhiteboardActive).
    // It only toggles the local overlay visibility, which is handled inside CCWhiteboardTile.tsx
    console.log('Whiteboard tile clicked (Overlay toggle)');
  };

  // [Submission state] Clear any pending extension submission on mount
  useEffect(() => {
    // Notify the extension to clear any stale pending submissions when entering a study room
    window.postMessage({ type: 'PEEKLE_CLEAR_PENDING' }, '*');
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const handleSelectProblem = (problem: Problem): void => {
    console.log('[StudyRoomClient] Selecting problem:', problem);
    // Ensure ID is a valid number
    const pId = Number(problem.problemId);
    if (!pId) {
      console.warn('[StudyRoomClient] Invalid problem ID:', problem.problemId);
      return;
    }
    // Extract studyProblemId from the problem (added by API)
    const studyProblemId = (problem as any).studyProblemId || (problem as any).id || null;
    setSelectedProblem(
      studyProblemId,
      pId,
      problem.title,
      problem.externalId || String((problem as any).number),
    );

    if (studyProblemId) {
      try {
        sessionStorage.setItem(lastSelectedProblemStorageKey, String(studyProblemId));
      } catch {
        // Ignore storage write failures
      }
    }
  };

  const handleDateChange = (date: Date): void => {
    setSelectedDate(date);
    console.log('Date selected:', date);
  };

  const handleToggleLeftPanel = (): void => {
    setIsLeftPanelFolded(!isLeftPanelFolded);
  };

  const isCompactLayout = viewport.width > 0 && (viewport.width < 1000 || viewport.height < 768);
  const hideCurrentProblemLabel = viewport.width >= 1000 && viewport.width < 1100;

  const problemList = (
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
      selectedStudyProblemId={selectedStudyProblemId ?? undefined}
      onToggleFold={handleToggleLeftPanel}
      isFolded={isLeftPanelFolded}
      submissions={submissions}
      onFetchSubmissions={(problemId) => void loadSubmissions(problemId)}
      showFoldButton={!isCompactLayout}
    />
  );

  useEffect(() => {
    if (selectedStudyProblemId || problems.length === 0) return;

    let cachedStudyProblemId: number | null = null;
    try {
      const raw = sessionStorage.getItem(lastSelectedProblemStorageKey);
      cachedStudyProblemId = raw ? Number(raw) : null;
    } catch {
      cachedStudyProblemId = null;
    }

    if (!cachedStudyProblemId) return;

    const matchedProblem = problems.find((p: any) => {
      const studyProblemId = Number((p as any).studyProblemId ?? (p as any).id);
      return studyProblemId === cachedStudyProblemId;
    });

    if (matchedProblem) {
      handleSelectProblem(matchedProblem);
    }
  }, [selectedStudyProblemId, problems, lastSelectedProblemStorageKey]);

  if (isCompactLayout) {
    return (
      <>
        <SettingsModal />
        <div className="flex h-screen flex-col bg-background text-foreground">
          <header className="shrink-0 border-b border-border">
            <StudyHeader
              onBack={handleBack}
              onAddProblem={handleAddProblem}
              onInvite={handleInvite}
              onSettings={handleSettings}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          </header>

          <div className="shrink-0 border-b border-border bg-card px-3 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                className={`h-9 rounded-md px-4 text-sm font-medium transition-colors ${
                  compactTab === 'problems'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setCompactTab('problems')}
              >
                문제선택
              </button>
              <button
                type="button"
                className={`h-9 rounded-md px-4 text-sm font-medium transition-colors ${
                  compactTab === 'ide'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setCompactTab('ide')}
              >
                IDE
              </button>
            </div>
          </div>

          <VideoGrid
            onWhiteboardClick={handleWhiteboardClick}
            className="shrink-0 bg-card"
          />

          <div className="min-h-0 flex-1">
            {compactTab === 'problems' ? (
              problemList
            ) : (
              <CenterPanel
                compactMode
                onWhiteboardClick={handleWhiteboardClick}
                onMicToggle={handleMicToggle}
                onVideoToggle={handleVideoToggle}
                onWhiteboardToggle={handleWhiteboardToggle}
                onSettingsClick={handleSettings}
                hideCurrentProblemLabel={hideCurrentProblemLabel}
                className="h-full"
              />
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SettingsModal />
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
        leftPanel={problemList}
        centerPanel={
          <CenterPanel
            onWhiteboardClick={handleWhiteboardClick}
            onMicToggle={handleMicToggle}
            onVideoToggle={handleVideoToggle}
            onWhiteboardToggle={handleWhiteboardToggle}
            onSettingsClick={handleSettings}
            hideCurrentProblemLabel={hideCurrentProblemLabel}
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

// Wrapper to provide SocketContext and handle Auth Check
export function CCStudyRoomClient(): React.ReactNode {
  const params = useParams();
  const searchParams = useSearchParams();
  const studyId = Number(params.id) || 0;
  const router = useRouter();
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check access permission before mounting socket/LiveKit
  useEffect(() => {
    if (!studyId) {
      setIsChecking(false);
      return;
    }

    fetchStudyRoom(studyId)
      .then((data) => {
        setRoomInfo({
          roomId: data.id,
          roomTitle: data.title,
          myRole: data.role,
        });
        setIsAuthorized(true);
      })
      .catch((err) => {
        console.error('[CCStudyRoomClient] Access Check Failed:', err);
        toast.error(err.message || '접근 권한이 없습니다.');
        router.replace('/study');
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [studyId, setRoomInfo, router]);

  // State for Pre-Join
  // Check if we came from list page with pre-selections
  const preJoined = searchParams.get('prejoined') === 'true';
  const paramMic = searchParams.get('mic') === 'true';
  const paramCam = searchParams.get('cam') === 'true';

  const [isJoined, setIsJoined] = useState(preJoined);
  const roomTitle = useRoomStore((state) => state.roomTitle);
  // If prejoined, use params. Else default (mic off, cam on).
  const [initialMediaState, setInitialMediaState] = useState({
    mic: preJoined ? paramMic : false,
    cam: preJoined ? paramCam : true,
  });

  const handleJoin = (mic: boolean, cam: boolean) => {
    setInitialMediaState({ mic, cam });
    setIsJoined(true);
  };
  // ...

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <span className="ml-2 text-lg font-medium text-foreground">스터디 정보 확인 중...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    // Already redirecting in useEffect, return empty or loader
    return null;
  }

  if (!isJoined) {
    return <CCPreJoinModal roomTitle={roomTitle} onJoin={handleJoin} />;
  }

  return (
    <SocketProvider roomId={studyId} userId={currentUserId ?? 0}>
      <StudySocketInitiator studyId={studyId} />
      <CCLiveKitWrapper
        studyId={studyId}
        initialMicEnabled={initialMediaState.mic}
        initialCamEnabled={initialMediaState.cam}
      >
        <StudyRoomContent studyId={studyId} />
      </CCLiveKitWrapper>
    </SocketProvider>
  );
}
