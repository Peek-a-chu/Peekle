'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface GameReconnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
    status: 'PLAYING' | 'END';
    title: string;
}

export function GameReconnectModal({
    isOpen,
    onClose,
    gameId,
    status,
    title,
}: GameReconnectModalProps) {
    const router = useRouter();

    const handleRejoin = () => {
        if (status === 'PLAYING') {
            router.push(`/game/${gameId}/play`);
        } else {
            // END 상태면 대기실로 (결과 확인)
            router.push(`/game/${gameId}`);
        }
        onClose();
    };

    const statusText = status === 'PLAYING'
        ? '아직 진행중인 게임이 있습니다!'
        : '끝난 게임이 있습니다!';

    const buttonText = status === 'PLAYING'
        ? '재입장'
        : '결과보기';

    if (!isOpen) return null;

    return (
        <>
            {/* 백드롭 - RGB 오버레이로 진하게 가림 */}
            <div
                className="absolute inset-0 z-40 bg-black/70"
            />

            {/* 모달 콘텐츠 - 중앙 정렬 */}
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-8">
                    {/* 헤더 */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                            {statusText}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            <span className="font-semibold text-foreground">{title}</span>
                        </p>
                    </div>

                    {/* 버튼 */}
                    <Button
                        onClick={handleRejoin}
                        className="w-full"
                        size="lg"
                    >
                        {buttonText}
                    </Button>
                </div>
            </div>
        </>
    );
}
