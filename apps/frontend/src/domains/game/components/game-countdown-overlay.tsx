'use client';

import { useState, useEffect, useRef } from 'react';

interface GameCountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
}

const COUNTDOWN_ITEMS = ['3', '2', '1', 'GO!'];
const INTERVAL_MS = 1000;

export function GameCountdownOverlay({ isActive, onComplete }: GameCountdownOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(-1);
      return;
    }

    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= COUNTDOWN_ITEMS.length) {
          clearInterval(interval);
          setTimeout(() => onCompleteRef.current(), 800);
          return prev;
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || currentIndex < 0) return null;

  const currentItem = COUNTDOWN_ITEMS[currentIndex];
  const isGo = currentItem === 'GO!';

  return (
    <div className="countdown-overlay">
      {/* 애니메이션 배경 그리드 */}
      <div className="grid-background" />

      {/* 별 파티클 */}
      <div className="star-field">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 회전하는 외곽 링 */}
      <div className="rotating-rings">
        <div className="ring outer-ring" />
        <div className="ring middle-ring" />
        <div className="ring inner-ring" />
      </div>

      {/* 충격파 효과 */}
      <div key={`shockwave-${currentIndex}`} className="shockwave" />

      {/* 헥사곤 프레임 */}
      <div className="hexagon-frame">
        <svg viewBox="0 0 100 100" className="hexagon-svg">
          <polygon
            points="50,3 97,25 97,75 50,97 3,75 3,25"
            className="hexagon-path"
          />
        </svg>
      </div>

      {/* 메인 카운트다운 */}
      <div key={currentIndex} className={`countdown-container ${isGo ? 'is-go' : ''}`}>
        {/* 번개 효과 */}
        <div className="lightning-effect" />

        {/* 메인 숫자 */}
        <div className="number-wrapper">
          <span className="shadow-text">{currentItem}</span>
          <span className="outline-text">{currentItem}</span>
          <span className="main-text">{currentItem}</span>
          <span className="shine-text">{currentItem}</span>
        </div>
      </div>

      {/* 코너 장식 */}
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      <style jsx global>{`
        .countdown-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--background));
          overflow: hidden;
        }

        /* 그리드 배경 */
        .grid-background {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(hsl(var(--primary) / 0.05) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: grid-move 20s linear infinite;
          perspective: 500px;
          transform: rotateX(60deg) scale(3);
          transform-origin: center top;
        }

        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }

        /* 별 필드 */
        .star-field {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: hsl(var(--primary));
          border-radius: 50%;
          animation: twinkle ease-in-out infinite;
          box-shadow: 0 0 10px 2px hsl(var(--primary) / 0.5);
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* 회전 링 */
        .rotating-rings {
          position: absolute;
          width: 400px;
          height: 400px;
        }

        .ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .outer-ring {
          border-top-color: hsl(var(--primary));
          border-right-color: hsl(var(--primary));
          animation: spin 3s linear infinite;
        }

        .middle-ring {
          inset: 30px;
          border-bottom-color: hsl(var(--primary) / 0.7);
          border-left-color: hsl(var(--primary) / 0.7);
          animation: spin 2s linear infinite reverse;
        }

        .inner-ring {
          inset: 60px;
          border-top-color: hsl(var(--primary) / 0.5);
          border-right-color: hsl(var(--primary) / 0.5);
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* 충격파 */
        .shockwave {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid hsl(var(--primary) / 0.8);
          animation: shockwave-expand 0.8s ease-out forwards;
          box-shadow: 
            0 0 20px hsl(var(--primary) / 0.5),
            inset 0 0 20px hsl(var(--primary) / 0.3);
        }

        @keyframes shockwave-expand {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(8);
            opacity: 0;
          }
        }

        /* 헥사곤 프레임 */
        .hexagon-frame {
          position: absolute;
          width: 350px;
          height: 350px;
        }

        .hexagon-svg {
          width: 100%;
          height: 100%;
          animation: hexagon-rotate 10s linear infinite;
        }

        .hexagon-path {
          fill: none;
          stroke: hsl(var(--primary));
          stroke-width: 0.5;
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: hexagon-draw 1s ease-out forwards;
          filter: drop-shadow(0 0 10px hsl(var(--primary) / 0.5));
        }

        @keyframes hexagon-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes hexagon-draw {
          to { stroke-dashoffset: 0; }
        }

        /* 카운트다운 컨테이너 */
        .countdown-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: container-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes container-enter {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(50px);
            filter: blur(20px);
          }
          60% {
            opacity: 1;
            filter: blur(0);
          }
          80% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }

        /* 번개 효과 */
        .lightning-effect {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 70%);
          animation: lightning-flash 0.3s ease-out;
        }

        @keyframes lightning-flash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* 숫자 레이어 */
        .number-wrapper {
          position: relative;
          font-family: inherit;
        }

        .shadow-text,
        .outline-text,
        .main-text,
        .shine-text {
          font-size: clamp(8rem, 20vw, 14rem);
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .shadow-text {
          position: absolute;
          color: transparent;
          text-shadow: 
            0 0 80px hsl(var(--primary) / 0.8),
            0 0 160px hsl(var(--primary) / 0.5);
        }

        .outline-text {
          position: absolute;
          -webkit-text-stroke: 2px hsl(var(--primary) / 0.5);
          color: transparent;
          filter: blur(3px);
        }

        .main-text {
          position: relative;
          color: hsl(var(--primary));
        }

        .shine-text {
          position: absolute;
          top: 0;
          left: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary-foreground) / 0.8) 50%,
            transparent 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shine-sweep 0.5s ease-out forwards;
        }

        @keyframes shine-sweep {
          0% { transform: translateX(-100%); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }

        /* GO! 스타일 - 테마의 오렌지 컬러 사용 */
        .is-go .shadow-text,
        .is-go .outline-text,
        .is-go .main-text,
        .is-go .shine-text {
          font-size: clamp(5rem, 14vw, 8rem);
        }

        .is-go .main-text {
          color: hsl(var(--color-orange));
          animation: fire-glow 0.2s ease-in-out infinite alternate;
        }

        .is-go .shadow-text {
          text-shadow: 
            0 0 80px hsl(var(--color-orange) / 0.9),
            0 0 160px hsl(var(--color-orange) / 0.7);
        }

        .is-go .outline-text {
          -webkit-text-stroke: 3px hsl(var(--color-orange) / 0.6);
        }

        @keyframes fire-glow {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.2); }
        }

        /* 코너 장식 */
        .corner {
          position: absolute;
          width: 80px;
          height: 80px;
          border-color: hsl(var(--primary) / 0.5);
          border-style: solid;
          border-width: 0;
        }

        .corner-tl { top: 40px; left: 40px; border-top-width: 3px; border-left-width: 3px; }
        .corner-tr { top: 40px; right: 40px; border-top-width: 3px; border-right-width: 3px; }
        .corner-bl { bottom: 40px; left: 40px; border-bottom-width: 3px; border-left-width: 3px; }
        .corner-br { bottom: 40px; right: 40px; border-bottom-width: 3px; border-right-width: 3px; }

        /* 반응형 */
        @media (max-width: 768px) {
          .rotating-rings { width: 250px; height: 250px; }
          .hexagon-frame { width: 200px; height: 200px; }
          .corner { width: 50px; height: 50px; }
          .corner-tl, .corner-tr { top: 20px; }
          .corner-bl, .corner-br { bottom: 20px; }
          .corner-tl, .corner-bl { left: 20px; }
          .corner-tr, .corner-br { right: 20px; }
        }
      `}</style>
    </div>
  );
}
