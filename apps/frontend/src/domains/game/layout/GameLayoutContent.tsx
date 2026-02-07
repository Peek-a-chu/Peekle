import { Button } from '@/components/ui/button';
import { GameRoomCard } from '@/domains/game/components/game-room-card';
import type { GameRoom } from '@/domains/game/types/game-types';

interface GameLayoutContentProps {
  rooms: GameRoom[];
  onRoomClick: (room: GameRoom) => void;
  onResetFilters: () => void;
  searchQuery: string;
  selectedMode: string | null;
  statusFilter: string;
}

export function GameLayoutContent({
  rooms,
  onRoomClick,
  onResetFilters,
  searchQuery,
  selectedMode,
  statusFilter,
}: GameLayoutContentProps) {
  const isFilterActive = selectedMode !== null || statusFilter !== 'ALL';

  return (
    <section>
      {rooms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <GameRoomCard key={room.id} room={room} onClick={() => onRoomClick(room)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          {searchQuery ? (
            // 2. 검색 결과 없음 (우선순위 높음)
            <>
              <p className="text-muted-foreground">'{searchQuery}'에 대한 검색 결과가 없습니다</p>
              <Button variant="link" className="mt-2 text-primary" onClick={onResetFilters}>
                검색어 초기화
              </Button>
            </>
          ) : isFilterActive ? (
            // 1. 필터 결과 없음
            <>
              <p className="text-muted-foreground">조건에 맞는 게임방이 없습니다</p>
              <Button variant="link" className="mt-2 text-primary" onClick={onResetFilters}>
                필터 초기화
              </Button>
            </>
          ) : (
            // 3. 그냥 방 없음 (기본)
            <>
              <p className="text-lg font-medium">현재 생성된 게임방이 없습니다</p>
              <p className="text-muted-foreground mt-1">새로운 방을 만들어 게임을 시작하세요!</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
