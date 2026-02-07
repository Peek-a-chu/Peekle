'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParticipantCard } from './participant-card';
import type { Participant, TeamType } from '@/domains/game/types/game-types';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ParticipantGridProps {
  participants: Participant[];
  maxPlayers: number;
  currentPlayers: number;
  teamType?: TeamType;
  isHost: boolean;
  onKickParticipant: (participantId: number) => void;
  currentUserId: number;
}

export function ParticipantGrid({
  participants,
  maxPlayers,
  currentPlayers,
  teamType = 'INDIVIDUAL',
  isHost,
  onKickParticipant,
  currentUserId,
}: ParticipantGridProps) {
  // 정렬 순서: 방장 > 준비완료 > 준비대기
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    if (a.status === 'READY' && b.status !== 'READY') return -1;
    if (a.status !== 'READY' && b.status === 'READY') return 1;
    return 0;
  });

  const isTeamMode = teamType === 'TEAM';
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);

  const renderParticipantCard = (participant: Participant) => (
    <ParticipantCard
      key={participant.id}
      participant={participant}
      isHost={isHost} // Viewing user is host?
      onKick={() => setKickTarget(participant)}
      isSelf={participant.id === currentUserId}
    />
  );

  const kickDialog = (
    <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">참여자 강퇴</AlertDialogTitle>
          <AlertDialogDescription>
            정말로 <strong>{kickTarget?.nickname}</strong> 님을 이 방에서 강퇴하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (kickTarget) {
                onKickParticipant(kickTarget.id);
                setKickTarget(null);
              }
            }}
          >
            강퇴하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isTeamMode) {
    // 팀전: 레드팀과 블루팀으로 분리
    const redTeam = sortedParticipants.filter((p) => p.team === 'RED');
    const blueTeam = sortedParticipants.filter((p) => p.team === 'BLUE');
    const halfMax = maxPlayers / 2; // 팀당 최대 인원

    const redEmptySlots = Math.max(0, halfMax - redTeam.length);
    const blueEmptySlots = Math.max(0, halfMax - blueTeam.length);

    return (
      <>
        <Card className="border-border bg-card dark:border-white/10 dark:bg-[#0F1624]">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-foreground dark:text-[#E8EEF9]">
              참여자 ({currentPlayers}/{maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            {/* 레드팀 */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-600 dark:text-red-500/90">레드팀</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {redTeam.map(renderParticipantCard)}
                {Array.from({ length: redEmptySlots }).map((_, index) => (
                  <ParticipantCard key={`red-empty-${index}`} isEmpty />
                ))}
              </div>
            </div>

            {/* 블루팀 */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-500/90">블루팀</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {blueTeam.map(renderParticipantCard)}
                {Array.from({ length: blueEmptySlots }).map((_, index) => (
                  <ParticipantCard key={`blue-empty-${index}`} isEmpty />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {kickDialog}
      </>
    );
  }

  // 개인전: 기존 로직
  const emptySlots = maxPlayers - sortedParticipants.length;
  const gridCols = maxPlayers <= 8 ? 'grid-cols-4' : 'grid-cols-4 lg:grid-cols-6';

  return (
    <>
      <Card className="border-border bg-card dark:border-white/10 dark:bg-[#0F1624]">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium text-foreground dark:text-[#E8EEF9]">
            참여자 ({currentPlayers}/{maxPlayers})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className={`grid gap-2 ${gridCols}`}>
            {sortedParticipants.map(renderParticipantCard)}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <ParticipantCard key={`empty-${index}`} isEmpty />
            ))}
          </div>
        </CardContent>
      </Card>
      {kickDialog}
    </>
  );
}
