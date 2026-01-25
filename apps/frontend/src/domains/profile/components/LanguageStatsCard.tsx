export function LanguageStatsCard() {
  const languages = [
    { name: 'Python', percentage: 65, color: 'bg-blue-500' },
    { name: 'JavaScript', percentage: 25, color: 'bg-yellow-400' }, // 디자인에선 다 파란색 계열이지만 구분 위함
    { name: 'Java', percentage: 10, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 h-full">
      <h3 className="text-gray-500 text-sm mb-4 flex items-center gap-1">
        <span>&lt; &gt;</span> 선호 언어
      </h3>
      <div className="space-y-4">
        {languages.map((lang) => (
          <div key={lang.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-900">{lang.name}</span>
              <span className="text-gray-500">{lang.percentage}%</span>
            </div>
            <div className="w-full bg-blue-50 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${lang.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
