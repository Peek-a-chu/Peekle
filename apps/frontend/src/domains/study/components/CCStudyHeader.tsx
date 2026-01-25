'use client';

import { useStudyHeader } from '@/domains/study/hooks/useStudyHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Copy, Settings } from 'lucide-react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCInviteModal } from './CCInviteModal';
import { CCStudySettingsModal } from './CCStudySettingsModal';

interface CCStudyHeaderProps {
  onBack?: () => void;
  onAddProblem?: (title: string, number: number, tags?: string[]) => Promise<void>;
  onInvite?: () => void;
  onSettings?: () => void;
  className?: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function CCStudyHeader({
  onBack,
  onInvite,
  onSettings,
  className,
}: CCStudyHeaderProps): React.ReactElement {
  const { roomTitle, whiteboardMessage, isWhiteboardActive, isOwner } = useStudyHeader();

  const isInviteModalOpen = useRoomStore((state) => state.isInviteModalOpen);
  const setInviteModalOpen = useRoomStore((state) => state.setInviteModalOpen);
  const isSettingsOpen = useRoomStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useRoomStore((state) => state.setSettingsOpen);

  return (
    <div className={cn('flex h-14 items-center justify-between px-4', className)}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로 가기">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold">{roomTitle}</h1>

        <div className="mx-2 h-6 w-px bg-border" />
      </div>

      {/* Center Section - Whiteboard Message */}
      {isWhiteboardActive && whiteboardMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-sm">
          {whiteboardMessage}
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onInvite} className="gap-2 font-normal">
          <Copy className="h-4 w-4" />
          초대하기
        </Button>

        {isOwner && (
          <Button variant="outline" size="sm" onClick={onSettings} className="gap-2 font-normal">
            <Settings className="h-4 w-4" />
            스터디 설정
          </Button>
        )}
      </div>

      {/* Modals */}
      <CCInviteModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <CCStudySettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
