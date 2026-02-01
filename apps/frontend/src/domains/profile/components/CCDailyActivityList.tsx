'use client';

import { useDailyActivities } from '../hooks/useProfileQueries';

export type ActivityType = 'STUDY' | 'GAME' | 'SOLO';

export interface CCDailyActivity {
  id: string; // Changed from number to string to support various ID types
  problemTitle: string;
  problemId: string;
  type: ActivityType;
  groupName?: string;
  gameType?: 'TEAM' | 'INDIVIDUAL';
  timestamp: string;
  isSuccess: boolean;
  link?: string;
}

interface Props {
  date: Date;
}

export function CCDailyActivityList({ date }: Props) {
  const { data: activities, isLoading, isError } = useDailyActivities(date);

  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[300px] flex items-center justify-center text-red-500">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  const list =
    activities?.map((item) => ({
      id: String(item.submissionId),
      problemTitle: item.title,
      problemId: item.problemId,
      type: item.sourceType === 'EXTENSION' ? 'SOLO' : (item.sourceType as ActivityType),
      groupName: item.tag,
      timestamp: new Date(item.submittedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSuccess: true, // Timeline usually shows successful or attempted. Assuming success based on item presence or logic
      link: item.link,
    })) || [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[300px]">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        📅{' '}
        <span className="underline decoration-indigo-200 decoration-4 underline-offset-4">
          {dateStr}
        </span>{' '}
        활동 기록
      </h3>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <div className="text-4xl mb-2">🍃</div>
          <p>이 날은 조용했네요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((activity) => (
            <div
              key={activity.id}
              className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                    activity.isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                  }`}
                >
                  {activity.isSuccess ? '✓' : '✗'}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={
                        activity.link || `https://www.acmicpc.net/problem/${activity.problemId}`
                      }
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
                        📚 {activity.groupName || '스터디'}
                      </span>
                    )}
                    {activity.type === 'GAME' && (
                      <>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          🎮 {activity.gameType === 'TEAM' ? '팀전' : '개인전'}
                        </span>
                        {activity.groupName && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {activity.groupName}
                          </span>
                        )}
                      </>
                    )}
                    {(activity.type === 'SOLO' || activity.type === 'EXTENSION') && (
                      <span className="text-xs text-gray-400">개인 풀이</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
