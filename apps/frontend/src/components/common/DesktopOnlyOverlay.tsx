'use client';

export function DesktopOnlyOverlay() {
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="desktop-only-overlay fixed inset-0 z-[9999] flex bg-black text-white"
      >
      <div className="flex h-full w-full flex-col items-center justify-center text-center px-6">
        <div className="text-xl font-bold">데스크탑 전용 서비스</div>
        <div className="mt-3 text-sm text-white/70 leading-relaxed">
          화면 크기가 작아 콘텐츠를 표시할 수 없습니다.
          <br />
          더 큰 화면에서 다시 접속해주세요.
        </div>
      </div>
      </div>
      <style jsx>{`
        .desktop-only-overlay {
          display: flex;
        }
        @media (min-width: 900px) and (min-height: 576px) {
          .desktop-only-overlay {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
