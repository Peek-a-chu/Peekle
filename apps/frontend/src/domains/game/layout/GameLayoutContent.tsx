import { Button } from '@/components/ui/button';
import { GameRoomCard } from '@/domains/game/components/game-room-card';
import type { GameRoom } from '@/domains/game/types/game-types';

interface GameLayoutContentProps {
  rooms: GameRoom[];
  onRoomClick: (room: GameRoom) => void;
  onResetFilters: () => void;
}

export function GameLayoutContent({ rooms, onRoomClick, onResetFilters }: GameLayoutContentProps) {
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
          <p className="text-muted-foreground">검색 결과가 없습니다</p>
          <Button variant="link" className="mt-2 text-primary" onClick={onResetFilters}>
            필터 초기화
          </Button>
        </div>
      )}
    </section>
  );
}
