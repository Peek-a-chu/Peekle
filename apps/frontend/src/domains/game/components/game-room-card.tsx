'use client';

import { Users, Clock, FileText, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import type { GameRoom } from '@/domains/game/types/game-types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

        {/* 출제 방식 정보 (새로 추가됨) */}
        <div className="mb-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  {room.workbookTitle ? (
                    <>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                        📚 문제집
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {room.workbookTitle}
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                        🎲 랜덤
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {room.tierMin}~{room.tierMax} {room.tags.length > 0 && `· ${room.tags.length > 3 ? `${room.tags.slice(0, 3).join(', ')}...` : room.tags.join(', ')}`}
                        {room.tags.length === 0 && '· 전체 태그'}
                      </span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs">
                {room.workbookTitle ? (
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-sm">선택된 문제집</p>
                      <p className="text-xs text-muted-foreground">{room.workbookTitle}</p>
                    </div>
                    {room.problems && room.problems.length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="font-semibold text-xs mb-1">포함된 문제</p>
                        {room.problems.map((problem, idx) => (
                          <div key={problem.id} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-3 text-center">{idx + 1}.</span>
                            <span className="flex-1 truncate">{problem.title}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {problem.tier}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-sm mb-1">난이도 범위</p>
                      <Badge variant="secondary" className="text-xs">
                        {room.tierMin} ~ {room.tierMax}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">포함된 태그</p>
                      {room.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {room.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">모든 태그 (전체 랜덤)</span>
                      )}
                    </div>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
