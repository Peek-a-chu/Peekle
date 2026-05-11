'use client';

import { forwardRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import {
  CCCollaborationIDEPanel,
  type CCCollaborationIDEPanelProps,
  type CCCollaborationIDEPanelRef,
  type CollaborationIDEPanelActionContext,
  type CollaborationIDEPanelToolbarControls,
} from '@/domains/collaboration/components/CCCollaborationIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

export type CCIDEPanelRef = CCCollaborationIDEPanelRef;

export interface CCIDEPanelProps extends Omit<
  CCCollaborationIDEPanelProps,
  'renderToolbar' | 'onSubmitRequest' | 'onRefChatRequest'
> {}

export const CCIDEPanel = forwardRef<CCIDEPanelRef, CCIDEPanelProps>((props, ref) => {
  const params = useParams();
  const studyId = params.id as string;
  const setRightPanelActiveTab = useRoomStore((state) => state.setRightPanelActiveTab);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);

  const handleRefChatRequest = useCallback(
    ({ code, language }: CollaborationIDEPanelActionContext): void => {
      const { selectedStudyProblemId, selectedProblemTitle, selectedProblemExternalId } =
        useRoomStore.getState();

      setPendingCodeShare({
        code,
        language,
        ownerName: 'Me',
        isRealtime: true,
        problemId: selectedStudyProblemId ?? undefined,
        externalId: selectedProblemExternalId ?? undefined,
        problemTitle: selectedProblemTitle ?? undefined,
      });

      setRightPanelActiveTab('chat');
      setTimeout(() => {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
      }, 0);
    },
    [setPendingCodeShare, setRightPanelActiveTab],
  );

  const handleSubmitRequest = useCallback(
    ({ code, language }: CollaborationIDEPanelActionContext): void => {
      const { selectedProblemId, selectedStudyProblemId, selectedProblemExternalId } =
        useRoomStore.getState();

      if (!selectedStudyProblemId) {
        toast.error('선택된 문제가 없습니다.');
        return;
      }

      window.postMessage(
        {
          type: 'PEEKLE_SUBMIT_CODE',
          payload: {
            studyProblemId: selectedStudyProblemId,
            externalId: selectedProblemExternalId,
            code,
            language,
            sourceType: 'STUDY',
          },
        },
        '*',
      );

      toast.info('자동 제출을 시작합니다...');

      window.dispatchEvent(
        new CustomEvent('study-problem-submitted', {
          detail: {
            studyId,
            problemId: selectedProblemId,
            externalId: selectedProblemExternalId ?? null,
          },
        }),
      );
    },
    [studyId],
  );

  const handleExecuteRequest = useCallback((): void => {
    if (props.onExecuteRequest) {
      props.onExecuteRequest();
      return;
    }

    window.dispatchEvent(new CustomEvent('study-ide-execute-trigger'));
  }, [props]);

  const renderToolbar = useCallback(
    ({
      language,
      theme,
      onLanguageChange,
      onThemeToggle,
      onCopy,
      onRefChat,
      onSubmit,
    }: CollaborationIDEPanelToolbarControls) => (
      <IDEToolbar
        language={language}
        theme={theme}
        onLanguageChange={onLanguageChange}
        onThemeToggle={onThemeToggle}
        onCopy={onCopy}
        onRefChat={onRefChat}
        onSubmit={onSubmit}
      />
    ),
    [],
  );

  return (
    <CCCollaborationIDEPanel
      {...props}
      ref={ref}
      renderToolbar={renderToolbar}
      onSubmitRequest={handleSubmitRequest}
      onRefChatRequest={handleRefChatRequest}
      onExecuteRequest={handleExecuteRequest}
    />
  );
});

CCIDEPanel.displayName = 'CCIDEPanel';
