import { GamePlayContainer } from '@/domains/game/components/game-play-container'

interface GamePlayPageProps {
    params: Promise<{
        roomId: string
    }>
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
    const { roomId } = await params

    return <GamePlayContainer roomId={roomId} />
}
