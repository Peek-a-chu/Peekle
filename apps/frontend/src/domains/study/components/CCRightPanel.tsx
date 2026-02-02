'use client';

import { ReactNode } from 'react';
import { useRoomStore, selectOnlineCount } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { StudyChatPanel } from './chat/StudyChatPanel';
import { StudyParticipantPanel } from './StudyParticipantPanel';

interface CCRightPanelProps {
  chatContent?: ReactNode;
  participantsContent?: ReactNode;
  onFold?: () => void;
  className?: string;
}

export function CCRightPanel({
  chatContent,
  participantsContent,
  onFold,
  className,
}: CCRightPanelProps) {
  const activeTab = useRoomStore((state) => state.rightPanelActiveTab);
  const setActiveTab = useRoomStore((state) => state.setRightPanelActiveTab);
  const onlineCount = useRoomStore(selectOnlineCount);
  const totalCount = useRoomStore((state) => state.participants.length);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Tab Headers */}
      <div className="flex bg-card border-b border-border items-center h-14 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-none border-r border-border"
          onClick={onFold}
          title="오른쪽 패널 접기"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex-1 px-4 h-full flex items-center justify-center text-sm font-medium transition-colors',
            activeTab === 'chat'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          채팅
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('participants')}
          className={cn(
            'flex-1 px-4 h-full flex items-center justify-center text-sm font-medium transition-colors',
            activeTab === 'participants'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          참여자 ({onlineCount}/{totalCount})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full">{chatContent ?? <StudyChatPanel />}</div>
        ) : (
          <div className="h-full">{participantsContent ?? <StudyParticipantPanel />}</div>
        )}
      </div>
    </div>
  );
}
