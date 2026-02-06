'use client';

import { create } from 'zustand';

interface GameLiveKitState {
    videoToken: string | null;
    setVideoToken: (token: string) => void;
    clearVideoToken: () => void;
}

export const useGameLiveKitStore = create<GameLiveKitState>((set) => ({
    videoToken: null,
    setVideoToken: (token) => set({ videoToken: token }),
    clearVideoToken: () => set({ videoToken: null }),
}));
