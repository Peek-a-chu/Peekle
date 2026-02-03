import { fetchServer } from '@/lib/serverApi';
import { ActivityStreakData, TimelineItemData, AIRecommendationData } from '@/domains/home/mocks/dashboardMocks';

export async function getActivityStreakServer(nickname?: string): Promise<ActivityStreakData[]> {
    const endpoint = nickname ? `/api/users/${nickname}/streak` : '/api/users/me/streak';
    const data = await fetchServer<ActivityStreakData[]>(endpoint);
    return data || [];
}

export async function getTimelineServer(date: string, nickname?: string): Promise<TimelineItemData[]> {
    const endpoint = nickname ? `/api/users/${nickname}/timeline?date=${date}` : `/api/users/me/timeline?date=${date}`;
    const data = await fetchServer<any[]>(endpoint); // Use any[] temporarily as backend DTO might differ slightly

    if (!data) return [];

    // Map backend response to TimelineItemData
    return data.map((item: any) => ({
        submissionId: item.submissionId,
        problemId: item.problemId,
        title: item.title,
        tier: item.tier ? item.tier.toLowerCase() : 'bronze',
        tierLevel: item.tierLevel,
        link: item.link,
        sources: [],
        sourceType: item.sourceType ? item.sourceType.toLowerCase() : 'problem',
        tag: item.tag,
        language: item.language,
        memory: item.memory,
        executionTime: item.executionTime,
        result: item.result,
        isSuccess: item.isSuccess,
        submittedAt: item.submittedAt
    }));
}

export async function getAIRecommendationsServer(): Promise<AIRecommendationData[]> {
    // Currently mock
    const { MOCK_AI_RECOMMENDATIONS } = await import('@/domains/home/mocks/dashboardMocks');
    return MOCK_AI_RECOMMENDATIONS;
}
