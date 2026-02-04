import type {
    Problem,
    User,
    Workbook,
    SearchResultItem as SearchResultItemType,
} from '@/api/searchApi';

export type SearchType = 'all' | 'problem' | 'user' | 'workbook';

// Type guards
export const isProblem = (item: SearchResultItemType): item is Problem => 'problemId' in item;
export const isUser = (item: SearchResultItemType): item is User => 'userId' in item;
export const isWorkbook = (item: SearchResultItemType): item is Workbook => 'workbookId' in item;
