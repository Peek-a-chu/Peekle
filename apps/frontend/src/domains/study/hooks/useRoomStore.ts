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

  // View state
  viewMode: ViewMode;
  targetSubmission: TargetSubmission | null; // For SPLIT_SAVED mode
  viewingUser: Participant | null; // For SPLIT_REALTIME mode

  // Participants
  participants: Participant[];
  currentUserId: number | null; // My ID

  // Modals
  isInviteModalOpen: boolean;
  isSettingsOpen: boolean;

  // Layout State (migrated from other stores/components)
  rightPanelActiveTab: string;
  isWhiteboardActive: boolean;
  whiteboardOpenedBy: string | null;
  whiteboardMessage: string | null;
}

export interface RoomActions {
  // Room info actions
  setRoomInfo: (
    info: Partial<
      Pick<RoomState, 'roomId' | 'roomTitle' | 'roomDescription' | 'inviteCode'>
    >,
  ) => void;
  setCurrentDate: (date: string) => void;

  // View state actions
  setViewMode: (mode: ViewMode) => void;
  setTargetSubmission: (submission: TargetSubmission | null) => void;
  viewRealtimeCode: (user: Participant) => void;
  resetToOnlyMine: () => void;

  // Participant actions
  setParticipants: (participants: Participant[]) => void;
  updateParticipant: (id: number, updates: Partial<Participant>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: number) => void;
  setCurrentUserId: (id: number) => void;

  // Modal actions
  setInviteModalOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;

  // Layout Actions
  setRightPanelActiveTab: (tab: string) => void;
  setIsWhiteboardActive: (isActive: boolean) => void;
  setWhiteboardOpenedBy: (user: string | null) => void;
  setWhiteboardMessage: (message: string | null) => void;
  
  // Test helper
  reset: () => void;
}

const initialState: RoomState = {
  roomId: null,
  roomTitle: '',
  roomDescription: '',
  inviteCode: '',
  currentDate: '',

  viewMode: 'ONLY_MINE',
  targetSubmission: null,
  viewingUser: null,

  participants: [],
  currentUserId: null,

  isInviteModalOpen: false,
  isSettingsOpen: false,

  rightPanelActiveTab: 'chat',
  isWhiteboardActive: false,
  whiteboardOpenedBy: null,
  whiteboardMessage: null,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  // Actions
  setRoomInfo: (info) => set((state) => ({ ...state, ...info })),
  setCurrentDate: (date) => set({ currentDate: date }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setTargetSubmission: (submission) => set({ targetSubmission: submission }),
  viewRealtimeCode: (user) => set({ viewMode: 'SPLIT_REALTIME', viewingUser: user }),
  resetToOnlyMine: () => set({ viewMode: 'ONLY_MINE', viewingUser: null, targetSubmission: null }),

  setParticipants: (participants) => set({ participants }),
  updateParticipant: (id, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    })),
  addParticipant: (participant) =>
    set((state) => ({ participants: [...state.participants, participant] })),
  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),
  setCurrentUserId: (id) => set({ currentUserId: id }),

  setInviteModalOpen: (isOpen) => set({ isInviteModalOpen: isOpen }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  setRightPanelActiveTab: (tab) => set({ rightPanelActiveTab: tab }),
  setIsWhiteboardActive: (isActive) => set({ isWhiteboardActive: isActive }),
  setWhiteboardOpenedBy: (user) => set({ whiteboardOpenedBy: user }),
  setWhiteboardMessage: (message) => set({ whiteboardMessage: message }),

  reset: () => set(initialState),
}));

// Selectors
export const selectSortedParticipants = (state: RoomState) => {
    return [...state.participants].sort((a, b) => {
        // Owner first
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        
        // Then online
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        // Alphabetical
        return a.nickname.localeCompare(b.nickname);
    });
};

export const selectOnlineCount = (state: RoomState) => state.participants.filter(p => p.isOnline).length;

export const selectIsOwner = (state: RoomState) => {
    if (!state.currentUserId) return false;
    const me = state.participants.find(p => p.id === state.currentUserId);
    return me?.isOwner || false;
};
