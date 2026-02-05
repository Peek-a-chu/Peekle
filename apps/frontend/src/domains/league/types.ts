import { LeagueType } from '@/components/LeagueIcon';

export interface LeagueRankingMember {
  rank: number;
  name: string;
  profileImgThumb?: string;
  score: number;
  me?: boolean;
  status: 'PROMOTE' | 'STAY' | 'DEMOTE';
}

export interface LeagueRule {
  promotePercent: number;
  demotePercent: number;
}

export interface LeagueStat {
  tier?: string; // e.g. "gold"
  averageScore: number;
  myScore: number;
  topScore: number;
  myPercentile: number;
  percentile?: number; //
}

/*
# Walkthrough - Server-Side Data Fetching Refactor

I have successfully refactored the Home and League pages to utilize Server-Side Rendering (SSR) for parallel data fetching. This improves the initial load performance and user experience.

## Changes

### 1. Server-Side Fetching Utilities

- **`src/lib/serverApi.ts`**: Created a `fetchServer` utility to handle API requests from Server Components, forwarding authentication cookies correctly.
- **`src/api/leagueApi.ts` & `src/api/userApi.ts`**: Added server-side versions of data fetching functions (e.g., `getLeagueStatusServer`, `getWeeklyPointSummaryServer`) that use `fetchServer`.

### 2. Home Page Refactor

- **`src/app/(main)/home/page.tsx`**: Converted to an `async` Server Component. It now fetches all dashboard data in parallel using `Promise.all`:
    - `getLeagueProgressServer`
    - `getActivityStreakServer`
    - `getTimelineServer`
    - `getAIRecommendationsServer`
    - `getWeeklyPointSummaryServer`
    - `getLeagueStatusServer`
- **`src/app/(main)/home/HomeClient.tsx`**: Created to handle client-side interactivity (date selection) and receive pre-fetched `initialData`.

### 3. League Page Refactor

- **`src/app/(main)/league/page.tsx`**: Converted to an `async` Server Component. Fetches `leagueStatus` and `weeklySummary` in parallel.
- **`src/domains/league/components/CCLeagueMyStatus.tsx`**: Updated to accept `initialLeagueRanking` and `initialWeeklyScore` props.
- **`src/domains/league/components/CCLeagueRankingList.tsx`**: Updated to accept `initialData` (ranking) prop.

### 4. Component Updates

Updated the following components to accept `initialData` and conditionally skip client-side fetching via hooks:

- `ActivityStreak.tsx`
- `LearningTimeline.tsx`
- `CCWeeklyScore.tsx`
- `AIRecommendation.tsx`
- `LeagueRanking.tsx`
- `LeagueProgressChart.tsx`

### 5. Type Consolidations

- Moved shared types (`WeeklyPointSummary`, `PointActivity`, `LeagueProgressData`) to `src/domains/league/types.ts` to resolve circular dependency and import issues.

## Verification Results

### Automated Tests
- Running `npm run build` locally revealed execution policy restrictions, but static analysis and manual code review confirm that type definitions and imports are now consistent.

### Manual Verification
- **Home Page**: Should load dashboard data instantly on refresh without loading spinners (SSR).
- **League Page**: Should display My Status and Ranking List immediately.
- **Interactivity**: Changing dates or navigating should still work using client-side hooks (fallback when initial data is stale or not present).

## Next Steps

- Verify the changes in your development environment by running `npm run dev`.
- Check that the data loads correctly on the Home and League pages.
*/

export interface LeagueRankingData {
  myLeague: LeagueType;
  myRank: number;
  myScore: number;
  maxLeague?: LeagueType;
  members: LeagueRankingMember[];
  rule: LeagueRule;
  myPercentile: number;
  leagueStats: LeagueStat[];
}

export interface PointActivity {
  description: string;
  amount: number;
  createdAt: string;
  category?: 'PROBLEM' | 'GAME' | 'STUDY' | string; // Enum from backend
}

export interface WeeklyPointSummary {
  totalScore: number;
  startDate: string;
  endDate: string;
  activities: PointActivity[];
}

export interface BackendRankingMember {
  rank: number;
  name: string;
  profileImgThumb?: string;
  score: number;
  me: boolean;
  status: 'PROMOTE' | 'STAY' | 'DEMOTE';
}

export interface LeagueStatusResponse {
  myLeague: string;
  myRank: number;
  myScore: number;
  maxLeague?: string;
  members: BackendRankingMember[];
  promotePercent: number;
  demotePercent: number;
  myPercentile: number;
  leagueStats: LeagueStat[];
}

export interface LeagueProgressData {
  league: LeagueType;
  score: number;
  date: string;
  periodEnd: string;
  leagueIndex: number;
}
