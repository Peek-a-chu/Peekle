import { useQuery } from '@tanstack/react-query';
import { fetchDailyActivities, fetchMonthlyStreaks, fetchMySubmissions } from '../api/profileApi';

export function useDailyActivities(date: Date) {
  return useQuery({
    queryKey: ['dailyActivities', date.toISOString().split('T')[0]],
    queryFn: () => fetchDailyActivities(date),
  });
}

export function useMonthlyStreaks() {
  return useQuery({
    queryKey: ['monthlyStreaks'],
    queryFn: fetchMonthlyStreaks,
  });
}

export function useMySubmissions(page: number, size = 20) {
  return useQuery({
    queryKey: ['mySubmissions', page, size],
    queryFn: () => fetchMySubmissions(page, size),
  });
}
