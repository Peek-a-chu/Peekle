import {
  getLeagueProgressServer,
  getWeeklyPointSummaryServer,
  getLeagueStatusServer,
} from '@/api/leagueServerApi';
import {
  getActivityStreakServer,
  getTimelineServer,
  getAIRecommendationsServer,
} from '@/api/userServerApi';
import HomeClient from './HomeClient';
import { DEFAULT_LEAGUE_RANKING } from '@/domains/league/utils';

export default async function HomePage() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Parallel Data Fetching
  const [leagueProgress, streak, timeline, recommendations, weeklyScore, leagueRanking] =
    await Promise.all([
      getLeagueProgressServer(),
      getActivityStreakServer(),
      getTimelineServer(dateStr),
      getAIRecommendationsServer(),
      getWeeklyPointSummaryServer(dateStr),
      getLeagueStatusServer(),
    ]);

  return (
    <HomeClient
      initialLeagueProgress={leagueProgress}
      initialStreak={streak}
      initialTimeline={timeline}
      initialRecommendations={recommendations}
      initialWeeklyScore={weeklyScore}
      initialLeagueRanking={leagueRanking || DEFAULT_LEAGUE_RANKING}
      initialDate={dateStr}
    />
  );
}
