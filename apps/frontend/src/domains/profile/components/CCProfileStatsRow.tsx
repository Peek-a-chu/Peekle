import { useState } from 'react';
import Image from 'next/image';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
}

export function CCProfileStatsRow({ user }: Props) {
  const [imgError, setImgError] = useState(false);

  // 리그 이름을 소문자로 변환하여 아이콘 파일명과 매칭 (e.g. "GOLD" -> "gold.svg")
  const leagueKey = user.league?.toLowerCase() || 'stone';
  const iconPath = `/icons/league/${leagueKey}.svg`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {/* 1. 현재 리그 */}
      <div className="p-4 rounded-lg bg-muted/30 text-center border border-border">
        <div className="flex justify-center mb-2">
          {/* 리그 아이콘 */}
          {!user.league || imgError ? (
            <div className="w-6 h-6 bg-muted rounded-lg flex items-center justify-center text-[6px] text-muted-foreground font-bold leading-tight border border-dashed border-border">
              UR
            </div>
          ) : (
            <Image
              src={iconPath}
              alt={`${user.league} tier icon`}
              width={24}
              height={24}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{user.league || '언랭크'}</p>
        <p className="text-sm text-muted-foreground">현재 리그</p>
      </div>

      {/* 2. 해결한 문제 */}
      <div className="p-4 rounded-lg bg-muted/30 text-center border border-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 mx-auto mb-2 text-green-500"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
        <p className="text-2xl font-bold text-foreground">{user.solvedCount || 0}</p>
        <p className="text-sm text-muted-foreground">해결한 문제</p>
      </div>

      {/* 3. 최근 스트릭 */}
      <div className="p-4 rounded-lg bg-muted/30 text-center border border-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 mx-auto mb-2 text-orange-500"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
        </svg>
        <p className="text-2xl font-bold text-foreground">{user.streakCurrent}일</p>
        <p className="text-sm text-muted-foreground">연속 스트릭</p>
      </div>

      {/* 4. 최대 스트릭 (전체 순위 대신 사용) */}
      <div className="p-4 rounded-lg bg-muted/30 text-center border border-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 mx-auto mb-2 text-indigo-500"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
        <p className="text-2xl font-bold text-foreground">{user.streakMax}일</p>
        <p className="text-sm text-muted-foreground">최대 스트릭</p>
      </div>
    </div>
  );
}
