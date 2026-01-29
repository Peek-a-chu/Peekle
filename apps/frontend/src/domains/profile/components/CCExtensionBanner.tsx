export function CCExtensionBanner() {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm text-primary text-xl border border-primary/10">
          🧩
        </div>
        <div>
          <p className="text-foreground text-base font-bold">확장프로그램 연동이 필요해요</p>
          <p className="text-muted-foreground text-sm mt-0.5">
            문제를 풀고 자동으로 리그 점수를 갱신하려면 연동해주세요.
          </p>
        </div>
      </div>
      <button className="bg-background text-primary text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/10 transition border border-primary/20 shadow-sm">
        연동 가이드 보기
      </button>
    </div>
  );
}
