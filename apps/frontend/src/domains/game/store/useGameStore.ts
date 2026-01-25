import { create } from 'zustand';

interface GameState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));
