import { create } from 'zustand';

interface StudyStoreState {
  // Panel State
  isLeftPanelFolded: boolean;
  isRightPanelFolded: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  unfoldLeftPanel: () => void;
  unfoldRightPanel: () => void;
  foldRightPanel: () => void;

  // Date State
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export const useStudyStore = create<StudyStoreState>((set) => ({
  isLeftPanelFolded: false,
  isRightPanelFolded: false,
  selectedDate: new Date(),

  toggleLeftPanel: () => set((state) => ({ isLeftPanelFolded: !state.isLeftPanelFolded })),
  toggleRightPanel: () => set((state) => ({ isRightPanelFolded: !state.isRightPanelFolded })),
  unfoldLeftPanel: () => set({ isLeftPanelFolded: false }),
  unfoldRightPanel: () => set({ isRightPanelFolded: false }),
  foldRightPanel: () => set({ isRightPanelFolded: true }),

  setSelectedDate: (date) => set({ selectedDate: date }),
}));
