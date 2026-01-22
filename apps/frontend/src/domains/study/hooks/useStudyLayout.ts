import { useState } from 'react';

export interface UseStudyLayoutReturn {
  isLeftPanelFolded: boolean;
  isRightPanelFolded: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  unfoldLeftPanel: () => void;
  unfoldRightPanel: () => void;
  foldRightPanel: () => void;
}

export function useStudyLayout(): UseStudyLayoutReturn {
  const [isLeftPanelFolded, setIsLeftPanelFolded] = useState(false);
  const [isRightPanelFolded, setIsRightPanelFolded] = useState(false);

  const toggleLeftPanel = () => setIsLeftPanelFolded((prev) => !prev);
  const toggleRightPanel = () => setIsRightPanelFolded((prev) => !prev);
  const unfoldLeftPanel = () => setIsLeftPanelFolded(false);
  const unfoldRightPanel = () => setIsRightPanelFolded(false);
  const foldRightPanel = () => setIsRightPanelFolded(true);

  return {
    isLeftPanelFolded,
    isRightPanelFolded,
    toggleLeftPanel,
    toggleRightPanel,
    unfoldLeftPanel,
    unfoldRightPanel,
    foldRightPanel,
  };
}
