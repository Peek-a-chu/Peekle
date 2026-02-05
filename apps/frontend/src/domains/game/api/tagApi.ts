import { apiFetch } from '@/lib/api';

export interface Tag {
    id: number;
    key: string;
    name: string;
}

export const tagApi = {
    getTags: async (): Promise<Tag[]> => {
        const response = await apiFetch<Tag[]>('/api/problems/tags');

        if (!response.success || !response.data) {
            throw new Error(response.error?.message || 'Failed to fetch tags');
        }

        return response.data;
    },
};
