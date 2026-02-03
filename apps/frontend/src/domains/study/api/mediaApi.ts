import { apiFetch } from '@/lib/api';

export const fetchLiveKitToken = async (studyId: number): Promise<string> => {
  const response = await apiFetch<string>(`/studies/${studyId}/media/token`, {
    // The response data IS the string or wrapped?
    // Spec says API returns standard ApiResponse.
    // If backend returns { success: true, data: "token...", error: null }
    // apiFetch extracts 'data'. So response.data is "token...".
    // But apiFetch generic <T> defines the shape of `data`.
    // If we pass <string>, then response.data is string | null.
    method: 'POST',
  });
  if (!response.data) {
    throw new Error('Failed to get video token');
  }
  return response.data;
};
