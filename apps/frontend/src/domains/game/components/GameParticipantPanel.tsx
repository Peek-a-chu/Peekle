'use client';

import { useState } from 'react';
import { Search, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GameParticipantCard } from './GameParticipantCard';
import type { GamePlayParticipant } from '@/domains/game/types/game-types';

interface GameParticipantPanelProps {
    participants: GamePlayParticipant[];
    currentUserId: number;
    isHost: boolean;
    micState: Record<string, boolean>; // Used for connection status & mic status
    camState: Record<string, boolean>;
    onKick?: (p: GamePlayParticipant) => void;
    onDelegate?: (p: GamePlayParticipant) => void;
    onMuteAll?: () => void;
    onMuteUser?: (p: GamePlayParticipant) => void;
    onVideoOffUser?: (p: GamePlayParticipant) => void;
    onViewCode?: (p: GamePlayParticipant) => void; // Code viewing handler
    onViewProfile?: (p: GamePlayParticipant) => void;
    onlineUserIds: Set<number>;
}

export function GameParticipantPanel({
    participants,
    currentUserId,
    isHost,
    micState,
    camState,
    onKick,
    onDelegate,
    onMuteAll,
    onMuteUser,
    onVideoOffUser,
    onViewCode,
    onViewProfile, // Optional
    onlineUserIds,
}: GameParticipantPanelProps) {
    const [search, setSearch] = useState('');

    // Filter based on search
    const filtered = participants.filter((p) =>
        p.nickname.toLowerCase().includes(search.toLowerCase())
    );

    // Use onlineUserIds Set for filtering
    const onlineParticipants = filtered.filter((p) => {
        return onlineUserIds.has(p.id);
    });

    const offlineParticipants = filtered.filter((p) => {
        return !onlineUserIds.has(p.id);
    });

    return (
        <div className="flex flex-col h-full bg-background relative select-none">
            <div className="p-4 pb-2 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="참여자 검색"
                        className="pl-9 h-10 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:border-primary transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Mute All Button (Owner Only) */}
                {isHost && (
                    <Button
                        variant="outline"
                        className="w-full text-foreground hover:bg-secondary/80 dark:hover:bg-muted/60 border-dashed border-border h-9 text-xs"
                        onClick={onMuteAll}
                    >
                        <VolumeX className="mr-2 h-3.5 w-3.5" />
                        전체 음소거
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-6">
                {/* Online Section */}
                <div>
                    <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full border border-green-200 bg-green-500 ring-4 ring-green-500/10" />
                        온라인 ({onlineParticipants.length})
                    </div>
                    <div className="space-y-2.5">
                        {onlineParticipants.map((p) => (
                            <GameParticipantCard
                                key={p.id}
                                participant={p}
                                isMe={p.id === currentUserId}
                                isRoomOwner={isHost}
                                isOnline={true}
                                micState={!micState[String(p.id)]} // micState: true means MUTED? Check GamePlayLayout.
                                // In GamePlayLayout: isMuted={micState[currentUserId] || false}
                                // So micState[p.id] == true means MUTED.
                                // Wait, in ParticipantCard: `participant.isMuted` implies Boolean.
                                // Here we pass boolean.
                                // The `GameParticipantCard` expects `micState` to be boolean "Is On"? Or "Is Muted"?
                                // Let's check `GameParticipantCard` code I just wrote:
                                // `{!micState && <MicOff ... />}` => So if `micState` is FALSE, it shows MicOff.
                                // So `micState` prop in Card should be "Is Mic On".
                                // In GamePlayLayout, `micState` map has `true` for MUTED.
                                // So "Is Mic On" = `!micState[p.id]`.
                                camState={!camState[String(p.id)]} // Same for cam.
                                onKick={onKick}
                                onDelegate={onDelegate}
                                onMuteUser={onMuteUser}
                                onVideoOffUser={onVideoOffUser}
                                onViewCode={onViewCode}
                                onViewProfile={onViewProfile}
                            />
                        ))}
                        {onlineParticipants.length === 0 && search && (
                            <div className="text-sm text-center text-muted-foreground py-8">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Offline Section */}
                {offlineParticipants.length > 0 && (
                    <div>
                        <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider border-t border-border/50 pt-4 mt-2">
                            <div className="w-2 h-2 rounded-full border border-slate-200 bg-slate-300 ring-4 ring-slate-200/50" />
                            오프라인 ({offlineParticipants.length})
                        </div>
                        <div className="space-y-2.5">
                            {offlineParticipants.map((p) => (
                                <GameParticipantCard
                                    key={p.id}
                                    participant={p}
                                    isMe={p.id === currentUserId}
                                    isRoomOwner={isHost}
                                    isOnline={false}
                                    micState={false}
                                    camState={false}
                                    onKick={onKick}
                                    onDelegate={onDelegate}
                                    // offline actions restricted usually
                                    onViewProfile={onViewProfile}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
