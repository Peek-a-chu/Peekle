import { create } from 'zustand';

interface StudyState {
  studyId: string | null;
  setStudyId: (id: string) => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  studyId: null,
  setStudyId: (id) => set({ studyId: id }),
}));