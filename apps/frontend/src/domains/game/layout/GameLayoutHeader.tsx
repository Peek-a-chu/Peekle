import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameLayoutHeaderProps {
  onCreateClick: () => void;
  onJoinWithCodeClick?: () => void;
}

export function GameLayoutHeader({ onCreateClick, onJoinWithCodeClick }: GameLayoutHeaderProps) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-foreground">게임 방</h1>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onJoinWithCodeClick} className="border-primary text-primary hover:bg-primary/10">
          초대 코드로 입장
        </Button>
        <Button onClick={onCreateClick} className="bg-primary hover:bg-primary-hover">
          <Plus className="mr-1 h-4 w-4" />방 만들기
        </Button>
      </div>
    </header>
  );
}
