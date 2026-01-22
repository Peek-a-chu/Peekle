import { create } from 'zustand';

export type ViewMode = 'ONLY_MINE' | 'SPLIT_REALTIME' | 'SPLIT_SAVED';

export interface Participant {
  id: number;
  odUid: string; // OpenVidu User ID
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
  problemTitle: string;
  language: string;
  memory: number;
  executionTime: number;
  code: string;
}

interface RoomState {
  // Room info
  roomId: number | null;
  roomTitle: string;
  roomDescription: string;
  inviteCode: string;
  currentDate: string;

  // Participants
  participants: Participant[];
  currentUserId: number | null;

  // View mode
  viewMode: ViewMode;
  viewingUser: Participant | null;
  targetSubmission: TargetSubmission | null;

  // Whiteboard
  isWhiteboardActive: boolean;
  whiteboardOpenedBy: Participant | null;
  whiteboardMessage: string;

  // UI state
  isSettingsOpen: boolean;
  isInviteModalOpen: boolean;
  rightPanelActiveTab: 'chat' | 'participants';
}

interface RoomActions {
  // Room actions
  setRoomInfo: (info: {
    roomId: number;
    roomTitle: string;
    roomDescription: string;
    inviteCode: string;
  }) => void;
  setCurrentDate: (date: string) => void;

  // Participant actions
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: number) => void;
  updateParticipant: (participantId: number, updates: Partial<Participant>) => void;
  setCurrentUserId: (userId: number) => void;

  // View mode actions
  setViewMode: (mode: ViewMode) => void;
  setViewingUser: (user: Participant | null) => void;
  setTargetSubmission: (submission: TargetSubmission | null) => void;
  viewRealtimeCode: (user: Participant) => void;
  viewSavedCode: (user: Participant, submission: TargetSubmission) => void;
  resetToOnlyMine: () => void;

  // Whiteboard actions
  openWhiteboard: (user: Participant, message: string) => void;
  closeWhiteboard: () => void;

  // UI actions
  setSettingsOpen: (open: boolean) => void;
  setInviteModalOpen: (open: boolean) => void;
  setRightPanelActiveTab: (tab: 'chat' | 'participants') => void;

  // Reset
  reset: () => void;
}

const initialState: RoomState = {
  roomId: null,
  roomTitle: '',
  roomDescription: '',
  inviteCode: '',
  currentDate: '',
  participants: [],
  currentUserId: null,
  viewMode: 'ONLY_MINE',
  viewingUser: null,
  targetSubmission: null,
  isWhiteboardActive: false,
  whiteboardOpenedBy: null,
  whiteboardMessage: '',
  isSettingsOpen: false,
  isInviteModalOpen: false,
  rightPanelActiveTab: 'chat',
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  setRoomInfo: (info) =>
    set({
      roomId: info.roomId,
      roomTitle: info.roomTitle,
      roomDescription: info.roomDescription,
      inviteCode: info.inviteCode,
    }),

  setCurrentDate: (date) => set({ currentDate: date }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    })),

  updateParticipant: (participantId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p,
      ),
    })),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setViewingUser: (user) => set({ viewingUser: user }),

  setTargetSubmission: (submission) => set({ targetSubmission: submission }),

  viewRealtimeCode: (user) =>
    set({
      viewMode: 'SPLIT_REALTIME',
      viewingUser: user,
      targetSubmission: null,
    }),

  viewSavedCode: (user, submission) =>
    set({
      viewMode: 'SPLIT_SAVED',
      viewingUser: user,
      targetSubmission: submission,
    }),

  resetToOnlyMine: () =>
    set({
      viewMode: 'ONLY_MINE',
      viewingUser: null,
      targetSubmission: null,
    }),

  openWhiteboard: (user, message) =>
    set({
      isWhiteboardActive: true,
      whiteboardOpenedBy: user,
      whiteboardMessage: message,
    }),

  closeWhiteboard: () =>
    set({
      isWhiteboardActive: false,
      whiteboardOpenedBy: null,
      whiteboardMessage: '',
    }),

  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),

  setRightPanelActiveTab: (tab) => set({ rightPanelActiveTab: tab }),

  reset: () => set(initialState),
}));

// Selectors
export const selectSortedParticipants = (state: RoomState & RoomActions) => {
  const { participants, currentUserId } = state;

  // Self first, then sort by Active Speaker (lastSpeakingAt desc)
  return [...participants].sort((a, b) => {
    // Self always first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;

    // Then by lastSpeakingAt (most recent first)
    const aTime = a.lastSpeakingAt ?? 0;
    const bTime = b.lastSpeakingAt ?? 0;
    return bTime - aTime;
  });
};

export const selectCurrentUser = (state: RoomState & RoomActions) => {
  return state.participants.find((p) => p.id === state.currentUserId) ?? null;
};

export const selectIsOwner = (state: RoomState & RoomActions) => {
  const currentUser = selectCurrentUser(state);
  return currentUser?.isOwner ?? false;
};

export const selectOnlineCount = (state: RoomState & RoomActions) => {
  return state.participants.filter((p) => p.isOnline).length;
};
