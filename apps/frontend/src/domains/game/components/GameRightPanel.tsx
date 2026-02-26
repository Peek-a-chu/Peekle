'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface GameRightPanelProps {
    chatContent: ReactNode;
    participantsContent: ReactNode;
    onlineCount: number;
    totalCount: number;
    onFold?: () => void;
    className?: string;
}

type ActiveTab = 'chat' | 'participants';

export function GameRightPanel({
    chatContent,
    participantsContent,
    onlineCount,
    totalCount,
    onFold,
    className,
}: GameRightPanelProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

    return (
        <div className={cn('flex h-full flex-col border-l border-border', className)}>
            {/* Tab Headers */}
            <div className="flex bg-card border-b border-border items-center h-14 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-10 rounded-none border-r border-border text-muted-foreground hover:text-foreground"
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
                    <div className="h-full">{chatContent}</div>
                ) : (
                    <div className="h-full">{participantsContent}</div>
                )}
            </div>
        </div>
    );
}
