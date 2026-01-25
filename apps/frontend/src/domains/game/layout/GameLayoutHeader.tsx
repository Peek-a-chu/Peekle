import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameLayoutHeaderProps {
  onCreateClick: () => void;
}

export function GameLayoutHeader({ onCreateClick }: GameLayoutHeaderProps) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-foreground">게임 방</h1>
      <Button onClick={onCreateClick} className="bg-primary hover:bg-primary-hover">
        <Plus className="mr-1 h-4 w-4" />방 만들기
      </Button>
    </header>
  );
}
