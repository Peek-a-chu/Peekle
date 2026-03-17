import { GameSocketProvider } from '@/domains/game/context/GameSocketContext';
export const dynamic = 'force-dynamic';

export default function GameRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameSocketProvider>
      {children}
    </GameSocketProvider>
  );
}
