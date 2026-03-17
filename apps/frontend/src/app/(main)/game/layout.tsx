import { GameSocketProvider } from '@/domains/game/context/GameSocketContext';

export default function MainGameLayout({ children }: { children: React.ReactNode }) {
  return <GameSocketProvider>{children}</GameSocketProvider>;
}
