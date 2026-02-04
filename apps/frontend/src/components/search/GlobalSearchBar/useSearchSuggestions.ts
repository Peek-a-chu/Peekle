import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { fetchSearchResults } from '@/api/searchApi';

const DEBOUNCE_DELAY_MS = 300;
const MIN_SEARCH_LENGTH = 1;

export interface SearchSuggestion {
    id: number;
    title: string;
    type: 'problem' | 'user' | 'workbook';
    tier?: string;
    externalId?: string;
    profileImg?: string;
}

export function useSearchSuggestions(query: string) {
    const [debouncedQuery] = useDebounce(query, DEBOUNCE_DELAY_MS);
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const response = await fetchSearchResults({
                    keyword: debouncedQuery,
                    category: 'ALL',
                    page: 0,
                    size: 4,
                });

                const { problems, workbooks, users } = response.data;
                const newSuggestions: SearchSuggestion[] = [];

                problems.forEach((p) =>
                    newSuggestions.push({
                        id: p.problemId,
                        title: p.title,
                        type: 'problem',
                        tier: p.tier,
                        externalId: p.externalId,
                    }),
                );

                users.forEach((u) =>
                    newSuggestions.push({
                        id: u.userId,
                        title: u.handle,
                        type: 'user',
                        tier: u.tier,
                        profileImg: u.profileImg,
                    }),
                );

                workbooks.forEach((w) =>
                    newSuggestions.push({
                        id: w.workbookId,
                        title: w.title,
                        type: 'workbook',
                    }),
                );

                setSuggestions(newSuggestions);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, [debouncedQuery]);

    return { suggestions, isLoading };
}
