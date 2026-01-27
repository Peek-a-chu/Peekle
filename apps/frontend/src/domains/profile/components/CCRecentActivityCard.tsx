interface ActivityItem {
  id: string;
  type: 'solve' | 'study' | 'game';
  title: string;
  platform?: string;
  timeAgo: string;
  description?: string;
}

export function CCRecentActivityCard() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'solve',
      title: 'Two Sum 문제를 해결했습니다',
      platform: 'LeetCode',
      timeAgo: '2시간 전',
    },
    {
      id: '2',
      type: 'solve',
      title: 'DFS와 BFS 문제를 해결했습니다',
      platform: 'BOJ',
      timeAgo: '5시간 전',
    },
    { id: '3', type: 'study', title: '알고리즘 스터디에서 2시간 학습했습니다', timeAgo: '1일 전' },
    {
      id: '4',
      type: 'game',
      title: '게임에서 승리! +25 LP',
      timeAgo: '2일 전',
      description: '승리',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-gray-500 text-sm mb-6">최근 활동</h3>
      <div className="space-y-6">
        {activities.map((item) => (
          <div key={item.id} className="flex gap-4 items-start">
            <div
              className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 
              ${item.type === 'solve'
                  ? 'bg-green-100 text-green-600'
                  : item.type === 'study'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
            >
              {item.type === 'solve' ? '✓' : item.type === 'study' ? '🕒' : '🏆'}
            </div>
            <div>
              <p className="text-gray-900 text-sm">
                <span className="font-medium">
                  {item.title.split(' ')[0]} {item.title.split(' ')[1]}
                </span>
                {item.title.split(' ').slice(2).join(' ')}
                {item.platform && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                    {item.platform}
                  </span>
                )}
              </p>
              {item.type === 'game' && (
                <span className="text-pink-500 text-xs font-bold">+25 LP</span>
              )}
              <p className="text-xs text-gray-400 mt-1">{item.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
