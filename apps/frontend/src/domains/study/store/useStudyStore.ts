import { create } from 'zustand';

interface StudyStoreState {
  // Panel State
  isLeftPanelFolded: boolean;
  isRightPanelFolded: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  unfoldLeftPanel: () => void;
  unfoldRightPanel: () => void;
  foldRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Date State
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export const useStudyStore = create<StudyStoreState>((set) => ({
  isLeftPanelFolded: false,
  isRightPanelFolded: false,
  leftPanelWidth: 256,
  rightPanelWidth: 320,
  selectedDate: new Date(),

  toggleLeftPanel: () => set((state) => ({ isLeftPanelFolded: !state.isLeftPanelFolded })),
  toggleRightPanel: () => set((state) => ({ isRightPanelFolded: !state.isRightPanelFolded })),
  unfoldLeftPanel: () => set({ isLeftPanelFolded: false }),
  unfoldRightPanel: () => set({ isRightPanelFolded: false }),
  foldRightPanel: () => set({ isRightPanelFolded: true }),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),

  setSelectedDate: (date) => set({ selectedDate: date }),
}));
