'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParticipantCard } from './participant-card';
import type { Participant, TeamType } from '@/domains/game/types/game-types';

interface ParticipantGridProps {
  participants: Participant[];
  maxPlayers: number;
  currentPlayers: number;
  teamType?: TeamType;
}

export function ParticipantGrid({
  participants,
  maxPlayers,
  currentPlayers,
  teamType = 'INDIVIDUAL',
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

  if (isTeamMode) {
    // 팀전: 레드팀과 블루팀으로 분리
    const redTeam = sortedParticipants.filter((p) => p.team === 'RED');
    const blueTeam = sortedParticipants.filter((p) => p.team === 'BLUE');
    const halfMax = maxPlayers / 2; // 팀당 최대 인원

    const redEmptySlots = Math.max(0, halfMax - redTeam.length);
    const blueEmptySlots = Math.max(0, halfMax - blueTeam.length);

    return (
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
              {redTeam.map((participant) => (
                <ParticipantCard key={participant.id} participant={participant} />
              ))}
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
              {blueTeam.map((participant) => (
                <ParticipantCard key={participant.id} participant={participant} />
              ))}
              {Array.from({ length: blueEmptySlots }).map((_, index) => (
                <ParticipantCard key={`blue-empty-${index}`} isEmpty />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 개인전: 기존 로직
  const emptySlots = maxPlayers - sortedParticipants.length;
  const gridCols = maxPlayers <= 8 ? 'grid-cols-4' : 'grid-cols-4 lg:grid-cols-6';

  return (
    <Card className="border-border bg-card dark:border-white/10 dark:bg-[#0F1624]">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-medium text-foreground dark:text-[#E8EEF9]">
          참여자 ({currentPlayers}/{maxPlayers})
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className={`grid gap-2 ${gridCols}`}>
          {sortedParticipants.map((participant) => (
            <ParticipantCard key={participant.id} participant={participant} />
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <ParticipantCard key={`empty-${index}`} isEmpty />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
