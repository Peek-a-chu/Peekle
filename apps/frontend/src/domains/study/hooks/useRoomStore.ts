import { create } from 'zustand';
import type { ChatType } from '../types/chat';

export type ViewMode = 'ONLY_MINE' | 'SPLIT_REALTIME' | 'SPLIT_SAVED';

export interface Participant {
  id: number;
  nickname: string;
  profileImage?: string;
  isOwner: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isOnline: boolean;
  lastSpeakingAt?: number;
}

export interface TargetSubmission {
  id: number;
  problemId?: number;
  problemTitle: string;
  username: string;
  language: string;
  memory: number;
  executionTime: number;
  code: string;
}

export interface RoomState {
  // Room info
  roomId: number | null;
  roomTitle: string;
  roomDescription: string;
  inviteCode: string;
  currentDate: string;
  myRole: 'OWNER' | 'MEMBER' | null;

  // View state
  viewMode: ViewMode;
  targetSubmission: TargetSubmission | null; // For SPLIT_SAVED mode
  viewingUser: Participant | null; // For SPLIT_REALTIME mode

  // Participants
  participants: Participant[];
  currentUserId: number | null; // My ID
  videoToken: string | null;
  watchers: string[]; // Nicknames of people watching me
  watcherCount: number;

  // Modals
  isInviteModalOpen: boolean;
  isSettingsOpen: boolean;

  // Layout State (migrated from other stores/components)
  rightPanelActiveTab: string;
  isWhiteboardActive: boolean;
  whiteboardOpenedBy: string | null;
  whiteboardMessage: string | null;
  isWhiteboardOverlayOpen: boolean;

  // Problem State
  selectedProblemId: number | null;
  selectedStudyProblemId: number | null;  // StudyProblem PK for submission
  selectedProblemTitle: string | null;
  selectedProblemExternalId: string | null; // Added

  // Chat State
  pendingCodeShare: {
    code: string;
    language: string;
    ownerName?: string;
    problemTitle?: string;
    problemId?: number; // Add problemId
    externalId?: string; // Add externalId
    isRealtime?: boolean;
  } | null;
  replyingTo: {
    id: string;
    senderId: number;
    senderName: string;
    content: string;
    type: ChatType;
  } | null;
}

export interface RoomActions {
  // Room info actions
  setRoomInfo: (
    info: Partial<
      Pick<RoomState, 'roomId' | 'roomTitle' | 'roomDescription' | 'inviteCode' | 'myRole'>
    >,
  ) => void;
  setCurrentDate: (date: string) => void;

  // View state actions
  setViewMode: (mode: ViewMode) => void;
  setTargetSubmission: (submission: TargetSubmission | null) => void;
  viewRealtimeCode: (user: Participant) => void;
  viewSharedCode: (data: {
    code: string;
    language: string;
    ownerName: string;
    problemTitle?: string;
    problemId?: number; // Add problemId
    externalId?: string;
    isRealtime?: boolean;
  }) => void;
  resetToOnlyMine: () => void;

  // Participant actions
  setParticipants: (participants: Participant[]) => void;
  setVideoToken: (token: string) => void;
  updateParticipant: (id: number, updates: Partial<Participant>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: number) => void;
  setCurrentUserId: (id: number) => void;
  setWatchers: (count: number, names: string[]) => void;

  // Modal actions
  setInviteModalOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;

  // Layout Actions
  setRightPanelActiveTab: (tab: string) => void;
  setIsWhiteboardActive: (isActive: boolean) => void;
  setWhiteboardOpenedBy: (user: string | null) => void;
  setWhiteboardMessage: (message: string | null) => void;
  setWhiteboardOverlayOpen: (isOpen: boolean) => void;

  // Problem Actions
  setSelectedProblemId: (id: number | null) => void;
  setSelectedProblemTitle: (title: string | null) => void;
  setSelectedProblem: (studyProblemId: number | null, problemId: number | null, title: string | null, externalId?: string | null) => void;

  // Chat Actions
  setPendingCodeShare: (
    data: {
      code: string;
      language: string;
      ownerName?: string;
      problemTitle?: string;
      problemId?: number; // Add problemId
      externalId?: string;
      isRealtime?: boolean;
    } | null,
  ) => void;
  setReplyingTo: (
    message: {
      id: string;
      senderId: number;
      senderName: string;
      content: string;
      type: ChatType;
    } | null,
  ) => void;

  // Test helper
  reset: () => void;
}

const initialState: RoomState = {
  roomId: null,
  roomTitle: '',
  roomDescription: '',
  inviteCode: '',
  currentDate: '',
  myRole: null,

  viewMode: 'ONLY_MINE',
  targetSubmission: null,
  viewingUser: null,

  participants: [],
  currentUserId: null,
  videoToken: null,
  watchers: [],
  watcherCount: 0,

  isInviteModalOpen: false,
  isSettingsOpen: false,

  rightPanelActiveTab: 'chat',
  isWhiteboardActive: false,
  whiteboardOpenedBy: null,
  whiteboardMessage: null,
  isWhiteboardOverlayOpen: false,

  selectedProblemId: null,
  selectedStudyProblemId: null,
  selectedProblemTitle: null,
  selectedProblemExternalId: null,

  pendingCodeShare: null,
  replyingTo: null,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  // Actions
  setRoomInfo: (info): void => set((state) => ({ ...state, ...info })),
  setCurrentDate: (date): void => set({ currentDate: date }),

  setViewMode: (mode): void => set({ viewMode: mode }),
  setTargetSubmission: (submission): void => set({ targetSubmission: submission }),
  viewRealtimeCode: (user): void => set({ viewMode: 'SPLIT_REALTIME', viewingUser: user }),
  viewSharedCode: (data): void =>
    set({
      viewMode: 'SPLIT_SAVED',
      targetSubmission: {
        id: Date.now(), // Unique ID for this shared code view
        problemTitle: data.problemTitle
          ? data.externalId
            ? `[${data.externalId}] ${data.problemTitle}`
            : data.problemTitle
          : 'Unknown Problem',
        username: data.ownerName,
        language: data.language,
        memory: 0,
        executionTime: 0,
        code: data.code,
      },
      viewingUser: null, // Clear realtime viewing user
    }),
  resetToOnlyMine: (): void =>
    set({ viewMode: 'ONLY_MINE', viewingUser: null, targetSubmission: null }),

  setParticipants: (participants): void => set({ participants }),
  setVideoToken: (token): void => set({ videoToken: token }),
  updateParticipant: (id, updates): void =>
    set((state) => ({
      participants: state.participants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addParticipant: (participant): void =>
    set((state) => ({ participants: [...state.participants, participant] })),
  removeParticipant: (id): void =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),
  setCurrentUserId: (id): void => set({ currentUserId: id }),
  setWatchers: (count, names): void => set({ watcherCount: count, watchers: names }),

  setInviteModalOpen: (isOpen): void => set({ isInviteModalOpen: isOpen }),
  setSettingsOpen: (isOpen): void => set({ isSettingsOpen: isOpen }),

  setRightPanelActiveTab: (tab): void => set({ rightPanelActiveTab: tab }),
  setIsWhiteboardActive: (isActive): void => set({ isWhiteboardActive: isActive }),
  setWhiteboardOpenedBy: (user): void => set({ whiteboardOpenedBy: user }),
  setWhiteboardMessage: (message): void => set({ whiteboardMessage: message }),
  setWhiteboardOverlayOpen: (isOpen): void => set({ isWhiteboardOverlayOpen: isOpen }),

  setSelectedProblemId: (id): void => set({ selectedProblemId: id }),
  setSelectedProblemTitle: (title): void => set({ selectedProblemTitle: title }),
  setSelectedProblem: (studyProblemId, problemId, title, externalId = null): void =>
    set({
      selectedStudyProblemId: studyProblemId,
      selectedProblemId: problemId,
      selectedProblemTitle: title,
      selectedProblemExternalId: externalId,
    }),

  setPendingCodeShare: (data): void => set({ pendingCodeShare: data }),
  setReplyingTo: (message): void => set({ replyingTo: message }),

  reset: (): void => set(initialState),
}));

// Selectors
export const selectSortedParticipants = (state: RoomState): Participant[] => {
  return [...state.participants].sort((a, b) => {
    // Owner first
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;

    // Then online
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;

    // Alphabetical
    return (a.nickname || '').localeCompare(b.nickname || '');
  });
};

export const selectOnlineCount = (state: RoomState): number =>
  state.participants.filter((p) => p.isOnline).length;

export const selectIsOwner = (state: RoomState): boolean => {
  if (state.myRole === 'OWNER') return true; // Priority internal state
  if (!state.currentUserId) return false;
  const me = state.participants.find((p) => p.id === state.currentUserId);
  return me?.isOwner || false;
};
