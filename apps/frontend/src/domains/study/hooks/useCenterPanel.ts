import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { type CCIDEPanelRef as IDEPanelRef } from '@/domains/study/components/CCIDEPanel';
import { useAuthStore } from '@/store/auth-store';

const normalizePreferredLanguage = (language?: string | null): string => {
  const normalized = (language || '').toLowerCase();
  if (normalized.includes('java') && !normalized.includes('script')) return 'java';
  if (
    normalized === 'c' ||
    normalized.includes('c11') ||
    normalized.includes('clang') ||
    normalized.includes('cpp') ||
    normalized.includes('c++')
  ) return 'cpp';
  return 'python';
};

export function useCenterPanel() {
  const [isVideoGridFolded, setIsVideoGridFolded] = useState(false);
  const preferredLanguage = useAuthStore((state) => state.user?.preferredLanguage);

  const viewMode = useRoomStore((state) => state.viewMode);
  const viewingUser = useRoomStore((state) => state.viewingUser);
  const targetSubmission = useRoomStore((state) => state.targetSubmission);
  const resetToOnlyMine = () => useRoomStore.getState().resetToOnlyMine();

  // IDE State
  const [language, setLanguage] = useState(() => normalizePreferredLanguage(preferredLanguage));
  const [theme, setTheme] = useState<'light' | 'vs-dark'>('light');
  const leftPanelRef = useRef<IDEPanelRef>(null);

  useEffect(() => {
    if (!preferredLanguage) return;
    setLanguage((prev) => {
      if (prev !== 'python') return prev;
      return normalizePreferredLanguage(preferredLanguage);
    });
  }, [preferredLanguage]);

  const isViewingOther = viewMode !== 'ONLY_MINE';

  const toggleVideoGrid = () => setIsVideoGridFolded((prev) => !prev);
  const handleThemeToggle = () => setTheme((prev) => (prev === 'light' ? 'vs-dark' : 'light'));

  // Forward methods to ref
  const handleCopy = () => leftPanelRef.current?.handleCopy();
  const handleSubmit = () => leftPanelRef.current?.handleSubmit();
  const handleRefChat = () => leftPanelRef.current?.handleRefChat();

  return {
    isVideoGridFolded,
    toggleVideoGrid,
    viewMode,
    viewingUser,
    targetSubmission,
    resetToOnlyMine,
    language,
    setLanguage,
    theme,
    handleThemeToggle,
    leftPanelRef,
    isViewingOther,
    handleCopy,
    handleSubmit,
    handleRefChat,
  };
}
