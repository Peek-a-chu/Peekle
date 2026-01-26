'use client';

import { useState } from 'react'; // Added in case, though not strictly used in the slice I see, but good practice if hooks are used later. Actually better not to add unused imports.
// Just adding 'use client' at top.

export type ActivityType = 'STUDY' | 'GAME' | 'SOLO';

export interface CCDailyActivity {
  id: string;
  problemTitle: string;
  problemId: number;
  type: ActivityType;
  groupName?: string; // 스터디 방 이름 또는 게임 방 이름
  gameType?: 'TEAM' | 'INDIVIDUAL';
  timestamp: string; // "YYYY-MM-DD HH:mm"
  isSuccess: boolean;
}

// Mock Data Generator
const MOCK_ACTIVITIES: CCDailyActivity[] = [
  {
    id: '1',
    problemTitle: 'A+B',
    problemId: 1000,
    type: 'SOLO',
    timestamp: '2026-01-22 14:30',
    isSuccess: true,
  },
  {
    id: '2',
    problemTitle: '미로 탐색',
    problemId: 2178,
    type: 'STUDY',
    groupName: '알고리즘 정복반',
    timestamp: '2026-01-22 15:00',
    isSuccess: true,
  },
  {
    id: '3',
    problemTitle: 'DFS와 BFS',
    problemId: 1260,
    type: 'GAME',
    groupName: '점심 내기 한판',
    gameType: 'INDIVIDUAL',
    timestamp: '2026-01-22 16:20',
    isSuccess: false,
  },
];

interface Props {
  date: Date;
  activities?: CCDailyActivity[];
}

export function CCDailyActivityList({ date, activities = MOCK_ACTIVITIES }: Props) {
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[300px]">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        📅{' '}
        <span className="underline decoration-indigo-200 decoration-4 underline-offset-4">
          {dateStr}
        </span>{' '}
        활동 기록
      </h3>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <div className="text-4xl mb-2">🍃</div>
          <p>이 날은 조용했네요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${activity.isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                    }`}
                >
                  {activity.isSuccess ? '✓' : '✗'}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={`https://www.acmicpc.net/problem/${activity.problemId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-900 font-bold hover:text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {activity.problemId}. {activity.problemTitle}
                      <span className="text-gray-300 text-xs font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗
                      </span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Labels */}
                    {activity.type === 'STUDY' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        📚 {activity.groupName}
                      </span>
                    )}
                    {activity.type === 'GAME' && (
                      <>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          🎮 {activity.gameType === 'TEAM' ? '팀전' : '개인전'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {activity.groupName}
                        </span>
                      </>
                    )}
                    {activity.type === 'SOLO' && (
                      <span className="text-xs text-gray-400">개인 풀이</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">
                  {activity.timestamp.split(' ')[1]}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
