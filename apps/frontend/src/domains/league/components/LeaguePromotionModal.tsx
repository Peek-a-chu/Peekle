'use client';

import { useEffect, useState } from 'react';
import { X, ChevronUp, ChevronDown, Minus, Sparkles } from 'lucide-react';
import LeagueIcon, { LeagueType, LEAGUE_NAMES, LEAGUE_COLORS } from '@/components/LeagueIcon';
import { useLeaguePromotionStore, PromotionStatus } from '../hooks/useLeaguePromotionStore';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG: Record<
    PromotionStatus,
    {
        title: string;
        subtitle: string;
        icon: typeof ChevronUp;
        colorClass: string;
    }
> = {
    PROMOTE: {
        title: '🎉 승급을 축하합니다!',
        subtitle: '더 높은 리그로 올라갔어요',
        icon: ChevronUp,
        colorClass: 'text-emerald-500',
    },
    STAY: {
        title: '리그 유지',
        subtitle: '다음 시즌도 화이팅!',
        icon: Minus,
        colorClass: 'text-blue-500',
    },
    DEMOTE: {
        title: '리그 강등',
        subtitle: '다음엔 꼭 다시 올라가요!',
        icon: ChevronDown,
        colorClass: 'text-rose-500',
    },
};

export function LeaguePromotionModal() {
    const { isOpen, status, fromLeague, toLeague, percentile, closeModal } = useLeaguePromotionStore();
    const [animationPhase, setAnimationPhase] = useState(0);

    const config = STATUS_CONFIG[status];
    const StatusIcon = config.icon;

    useEffect(() => {
        if (isOpen) {
            setAnimationPhase(0);
            const timer1 = setTimeout(() => setAnimationPhase(1), 100);
            const timer2 = setTimeout(() => setAnimationPhase(2), 500);
            const timer3 = setTimeout(() => setAnimationPhase(3), 1000);
            const timer4 = setTimeout(() => setAnimationPhase(4), 1500);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-500"
                style={{ opacity: animationPhase >= 1 ? 1 : 0 }}
                onClick={closeModal}
            />

            {/* 파티클 효과 (승급 시에만) */}
            {status === 'PROMOTE' && animationPhase >= 2 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className="particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 1}s`,
                                animationDuration: `${1.5 + Math.random() * 1}s`,
                                backgroundColor: i % 2 === 0 ? LEAGUE_COLORS[toLeague] : '#FFD700',
                            }}
                        />
                    ))}
                    {/* 빛나는 별 효과 */}
                    {[...Array(10)].map((_, i) => (
                        <Sparkles
                            key={`star-${i}`}
                            className="absolute text-yellow-400 animate-ping"
                            style={{
                                left: `${10 + Math.random() * 80}%`,
                                top: `${10 + Math.random() * 80}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: '1.5s',
                                width: 16 + Math.random() * 16,
                                height: 16 + Math.random() * 16,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* 모달 컨텐츠 */}
            <div
                className={`modal-content relative bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl ${status.toLowerCase()}`}
                style={{
                    opacity: animationPhase >= 1 ? 1 : 0,
                    transform: animationPhase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(30px)',
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                {/* 닫기 버튼 */}
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* 상태 아이콘 */}
                <div className="flex justify-center mb-6">
                    <div
                        className={`status-icon-wrapper ${status.toLowerCase()}`}
                        style={{
                            opacity: animationPhase >= 2 ? 1 : 0,
                            transform: animationPhase >= 2 ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
                            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        <StatusIcon className={`w-12 h-12 ${config.colorClass}`} />
                    </div>
                </div>

                {/* 타이틀 */}
                <div
                    className="text-center mb-8"
                    style={{
                        opacity: animationPhase >= 2 ? 1 : 0,
                        transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'all 0.5s ease-out 0.1s',
                    }}
                >
                    <h2 className={`text-2xl font-bold mb-2 ${config.colorClass}`}>{config.title}</h2>
                    <p className="text-muted-foreground">{config.subtitle}</p>
                </div>

                {/* 리그 전환 표시 */}
                <div
                    className="flex items-center justify-center gap-8 mb-8"
                    style={{
                        opacity: animationPhase >= 3 ? 1 : 0,
                        transition: 'opacity 0.5s ease-out',
                    }}
                >
                    {/* 이전 리그 */}
                    <div
                        className="flex flex-col items-center from-league"
                        style={{
                            opacity: animationPhase >= 3 ? (status === 'STAY' ? 1 : 0.5) : 0,
                            transform: animationPhase >= 3 ? 'translateX(0) scale(1)' : 'translateX(-30px) scale(0.8)',
                            transition: 'all 0.5s ease-out',
                        }}
                    >
                        <LeagueIcon league={fromLeague} size={72} />
                        <span className="mt-3 text-sm text-muted-foreground font-medium">{LEAGUE_NAMES[fromLeague]}</span>
                    </div>

                    {/* 화살표 애니메이션 */}
                    <div
                        className={`flex items-center ${config.colorClass}`}
                        style={{
                            opacity: animationPhase >= 3 ? 1 : 0,
                            transform: animationPhase >= 3 ? 'scale(1)' : 'scale(0)',
                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s',
                        }}
                    >
                        {status === 'PROMOTE' && (
                            <div className="arrow-up">
                                <ChevronUp className="w-10 h-10" />
                            </div>
                        )}
                        {status === 'STAY' && <Minus className="w-10 h-10 opacity-50" />}
                        {status === 'DEMOTE' && (
                            <div className="arrow-down">
                                <ChevronDown className="w-10 h-10" />
                            </div>
                        )}
                    </div>

                    {/* 새 리그 */}
                    <div
                        className="flex flex-col items-center to-league"
                        style={{
                            opacity: animationPhase >= 3 ? 1 : 0,
                            transform: animationPhase >= 3 ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.8)',
                            transition: 'all 0.5s ease-out 0.1s',
                        }}
                    >
                        <div
                            className="league-glow"
                            style={{ '--league-color': LEAGUE_COLORS[toLeague] } as React.CSSProperties}
                        >
                            <LeagueIcon league={toLeague} size={72} />
                        </div>
                        <span className="mt-3 text-sm font-bold" style={{ color: LEAGUE_COLORS[toLeague] }}>
                            {LEAGUE_NAMES[toLeague]}
                        </span>
                    </div>
                </div>

                {/* 퍼센트 정보 */}
                <div
                    className="text-center mb-6"
                    style={{
                        opacity: animationPhase >= 4 ? 1 : 0,
                        transform: animationPhase >= 4 ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.4s ease-out',
                    }}
                >
                    <p className="text-sm text-muted-foreground">
                        {status === 'PROMOTE' && `🏆 상위 ${percentile}%로 승급!`}
                        {status === 'STAY' && `상위 ${percentile}%로 리그 유지`}
                        {status === 'DEMOTE' && `상위 ${percentile}%로 아쉽게 강등`}
                    </p>
                </div>

                {/* 확인 버튼 */}
                <div
                    style={{
                        opacity: animationPhase >= 4 ? 1 : 0,
                        transform: animationPhase >= 4 ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.4s ease-out 0.1s',
                    }}
                >
                    <Button onClick={closeModal} className="w-full" size="lg">
                        확인
                    </Button>
                </div>
            </div>

            <style jsx global>{`
        .status-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-icon-wrapper.promote {
          background: linear-gradient(135deg, hsl(var(--color-green) / 0.3), hsl(var(--color-green) / 0.1));
          box-shadow: 0 0 40px hsl(var(--color-green) / 0.4);
          animation: pulse-promote 1.5s ease-in-out infinite;
        }

        .status-icon-wrapper.stay {
          background: linear-gradient(135deg, hsl(var(--color-blue) / 0.2), hsl(var(--color-blue) / 0.1));
          box-shadow: 0 0 20px hsl(var(--color-blue) / 0.2);
        }

        .status-icon-wrapper.demote {
          background: linear-gradient(135deg, hsl(var(--destructive) / 0.2), hsl(var(--destructive) / 0.1));
          box-shadow: 0 0 20px hsl(var(--destructive) / 0.1);
        }

        @keyframes pulse-promote {
          0%, 100% { 
            box-shadow: 0 0 40px hsl(var(--color-green) / 0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 60px hsl(var(--color-green) / 0.6);
            transform: scale(1.05);
          }
        }

        .modal-content.promote {
          box-shadow: 0 0 80px hsl(var(--color-green) / 0.2);
        }

        .league-glow {
          animation: league-pulse 2s ease-in-out infinite;
        }

        @keyframes league-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px var(--league-color)); }
          50% { filter: drop-shadow(0 0 20px var(--league-color)); }
        }

        .arrow-up {
          animation: bounce-up 0.8s ease-in-out infinite;
        }

        .arrow-down {
          animation: bounce-down 0.8s ease-in-out infinite;
        }

        @keyframes bounce-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes bounce-down {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }

        .particle {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: particle-rise ease-out forwards;
          opacity: 0;
        }

        @keyframes particle-rise {
          0% {
            bottom: 20%;
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: scale(1) rotate(90deg);
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: scale(0.3) rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}
