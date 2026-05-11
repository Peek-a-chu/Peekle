import 'server-only';

import { GamePlayContainer } from '@/domains/game/components/game-play-container';

export const dynamic = 'force-dynamic';

interface GamePlayPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const { roomId } = await params;

  return <GamePlayContainer roomId={roomId} />;
}
