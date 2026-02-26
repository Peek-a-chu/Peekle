import { useState, useRef } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { type CCIDEPanelRef as IDEPanelRef } from '@/domains/study/components/CCIDEPanel';

export function useCenterPanel() {
  const [isVideoGridFolded, setIsVideoGridFolded] = useState(false);

  const viewMode = useRoomStore((state) => state.viewMode);
  const viewingUser = useRoomStore((state) => state.viewingUser);
  const targetSubmission = useRoomStore((state) => state.targetSubmission);
  const resetToOnlyMine = () => useRoomStore.getState().resetToOnlyMine();

  // IDE State
  const [language, setLanguage] = useState('python');
  const [theme, setTheme] = useState<'light' | 'vs-dark'>('light');
  const leftPanelRef = useRef<IDEPanelRef>(null);

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
