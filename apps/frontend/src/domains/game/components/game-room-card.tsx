'use client';

import { Users, Clock, FileText, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import type { GameRoom } from '@/domains/game/types/game-types';

interface GameRoomCardProps {
  room: GameRoom;
  onClick?: () => void;
}

const modeLabels = {
  TIME_ATTACK: '타임어택',
  SPEED_RACE: '스피드',
};

const teamLabels = {
  INDIVIDUAL: '개인전',
  TEAM: '팀전',
};

export function GameRoomCard({ room, onClick }: GameRoomCardProps) {
  const isPlaying = room.status === 'PLAYING';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        // 배경색 변경 로직 제거 (항상 기본 배경 사용)
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* 상단: 제목 + 상태 배지 */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{room.title}</h3>
              {room.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {teamLabels[room.teamType]} · {modeLabels[room.mode]}
            </p>
          </div>
          <Badge
            variant={isPlaying ? 'default' : 'secondary'}
            className={cn(isPlaying && 'bg-primary hover:bg-primary/80')}
          >
            {isPlaying ? '진행 중' : '대기 중'}
          </Badge>
        </div>

        {/* 중간: 정보 아이콘들 */}
        <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {room.currentPlayers}/{room.maxPlayers}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{Math.floor(room.timeLimit / 60)}분</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{room.problemCount}문제</span>
          </div>
        </div>

        {/* 하단: 호스트 정보 */}
        <div className="flex items-center gap-2">
          <UserIcon src={room.host.profileImg} nickname={room.host.nickname} size={24} />
          <span className="text-sm text-muted-foreground">{room.host.nickname}</span>
        </div>
      </CardContent>
    </Card>
  );
}
