export function ExtensionBanner() {
    return (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500 text-xl">
                    🧩
                </div>
                <div>
                    <p className="text-indigo-950 text-base font-bold">확장프로그램 연동이 필요해요</p>
                    <p className="text-indigo-700 text-sm mt-0.5">문제를 풀고 자동으로 리그 점수를 갱신하려면 연동해주세요.</p>
                </div>
            </div>
            <button className="bg-white text-indigo-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-50 transition border border-indigo-100 shadow-sm">
                연동 가이드 보기
            </button>
        </div>
    );
}
