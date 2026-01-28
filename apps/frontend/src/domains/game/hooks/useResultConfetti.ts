import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface UseResultConfettiProps {
    isOpen: boolean;
    teamType: 'INDIVIDUAL' | 'TEAM';
    isWin: boolean;
    isDraw: boolean;
}

export function useResultConfetti({ isOpen, teamType, isWin, isDraw }: UseResultConfettiProps) {
    useEffect(() => {
        if (!isOpen) return;

        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            if (teamType === 'INDIVIDUAL') {
                // 개인전: 모두에게 축하 폭죽
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            } else if (isDraw) {
                // 무승부 (팀전): 가벼운 효과
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 } });
            } else if (isWin) {
                // 승리 (팀전): 화려한 폭죽
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            } else {
                // 패배 (팀전): 어두운 비
                confetti({
                    ...defaults,
                    particleCount: particleCount * 0.5,
                    colors: ['#4B5563', '#1F2937', '#9CA3AF'],
                    gravity: 2.5,
                    scalar: 0.7,
                    startVelocity: 15,
                    origin: { x: randomInRange(0.1, 0.9), y: 0.05 }
                });
            }
        }, 250);

        return () => clearInterval(interval);
    }, [isOpen, teamType, isWin, isDraw]);
}
