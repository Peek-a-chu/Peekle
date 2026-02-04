import type { SearchResultItem as SearchResultItemType } from '@/api/searchApi';
import { SearchResultItem } from './SearchResultItem';
import { UserGridItem } from './UserGridItem';
import { WorkbookGridItem } from './WorkbookGridItem';
import { isProblem, isUser, isWorkbook, type SearchType } from './search.types';

interface SearchResultSectionProps {
    title: string;
    type: SearchType;
    results: SearchResultItemType[];
    query: string;
    onMoreClick: () => void;
    onItemClick: (result: SearchResultItemType) => void;
}

export function SearchResultSection({
    title,
    type,
    results,
    query,
    onMoreClick,
    onItemClick,
}: SearchResultSectionProps) {
    if (results.length === 0) return null;

    const isGrid = type === 'user' || type === 'workbook';

    return (
        <div className="mb-8 last:mb-0">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                <button
                    onClick={onMoreClick}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                    더보기
                </button>
            </div>

            {isGrid ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {results.map((result) => {
                        if (type === 'user' && isUser(result)) {
                            return (
                                <UserGridItem
                                    key={result.userId}
                                    result={result}
                                    query={query}
                                    onClick={() => onItemClick(result)}
                                />
                            );
                        } else if (type === 'workbook' && isWorkbook(result)) {
                            return (
                                <WorkbookGridItem
                                    key={result.workbookId}
                                    result={result}
                                    query={query}
                                    onClick={() => onItemClick(result)}
                                />
                            );
                        }
                        return null;
                    })}
                </div>
            ) : (
                <div className="bg-card rounded-[24px] border border-border divide-y divide-border overflow-hidden">
                    {results.map((result) => (
                        <SearchResultItem
                            key={
                                isProblem(result)
                                    ? `p-${result.problemId}`
                                    : isUser(result)
                                        ? `u-${result.userId}`
                                        : isWorkbook(result)
                                            ? `w-${result.workbookId}`
                                            : 'unknown'
                            }
                            result={result}
                            query={query}
                            onClick={() => onItemClick(result)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
