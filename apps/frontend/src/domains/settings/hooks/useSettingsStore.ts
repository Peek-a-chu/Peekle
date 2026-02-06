import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsTab = 'theme' | 'device';

interface SettingsState {
  // UI State
  isOpen: boolean;
  activeTab: SettingsTab;

  // Device State
  selectedCameraId: string;
  selectedMicId: string;
  selectedSpeakerId: string;
  micVolume: number;
  speakerVolume: number;
  isMicTestRunning: boolean;
  isSpeakerTestRunning: boolean;

  // Actions
  openModal: (tab?: SettingsTab) => void;
  closeModal: () => void;
  setActiveTab: (tab: SettingsTab) => void;
  setCamera: (id: string) => void;
  setMic: (id: string) => void;
  setSpeaker: (id: string) => void;
  setMicVolume: (volume: number) => void;
  setSpeakerVolume: (volume: number) => void;
  toggleMicTest: () => void;
  toggleSpeakerTest: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeTab: 'theme',

      selectedCameraId: 'default',
      selectedMicId: 'default',
      selectedSpeakerId: 'default',
      micVolume: 75,
      speakerVolume: 80,
      isMicTestRunning: false,
      isSpeakerTestRunning: false,

      openModal: (tab = 'theme') => set({ isOpen: true, activeTab: tab }),
      closeModal: () => set({ isOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCamera: (id) => set({ selectedCameraId: id }),
      setMic: (id) => set({ selectedMicId: id }),
      setSpeaker: (id) => set({ selectedSpeakerId: id }),
      setMicVolume: (volume) => set({ micVolume: volume }),
      setSpeakerVolume: (volume) => set({ speakerVolume: volume }),
      toggleMicTest: () => set((state) => ({ isMicTestRunning: !state.isMicTestRunning })),
      toggleSpeakerTest: () =>
        set((state) => ({ isSpeakerTestRunning: !state.isSpeakerTestRunning })),
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        selectedCameraId: state.selectedCameraId,
        selectedMicId: state.selectedMicId,
        selectedSpeakerId: state.selectedSpeakerId,
        micVolume: state.micVolume,
        speakerVolume: state.speakerVolume,
      }),
    },
  ),
);
