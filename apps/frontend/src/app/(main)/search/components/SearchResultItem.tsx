import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import BookIcon from '@/assets/icons/book.svg';
import type { SearchResultItem as SearchResultItemType } from '@/api/searchApi';
import { isProblem, isUser, isWorkbook } from './search.types';
import { getTierStyle, highlightMatch } from './search.constants';

interface SearchResultItemProps {
    result: SearchResultItemType;
    query: string;
    onClick: () => void;
}

export function SearchResultItem({ result, query, onClick }: SearchResultItemProps) {
    let tierStyle = { bg: 'bg-gray-100', text: 'text-gray-600' };
    let title = '';
    let description = '';
    let tags: string[] = [];
    let tier = '';

    if (isProblem(result)) {
        tierStyle = getTierStyle(result.tier);
        title = result.title;
        tier = result.tier;
        tags = result.tags;
    } else if (isUser(result)) {
        tierStyle = getTierStyle(result.tier);
        title = result.handle;
        description = `${result.league}`;
        tier = result.tier;
    } else if (isWorkbook(result)) {
        title = result.title;
        description = result.description;
    }

    return (
        <div
            className="relative flex items-center gap-4 p-4 min-h-[72px] cursor-pointer hover:bg-accent transition-colors"
            onClick={onClick}
        >
            {/* Left Indicator */}
            <div className="flex-shrink-0 w-16 flex justify-center">
                {isProblem(result) ? (
                    <div
                        className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap',
                            tierStyle.bg,
                            tierStyle.text,
                        )}
                    >
                        {tier?.split('_')[0] || 'Unrated'}
                    </div>
                ) : isUser(result) ? (
                    <UserIcon
                        src={result.profileImg}
                        nickname={result.handle}
                        size={40}
                        className="border-border"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <BookIcon className="h-5 w-5" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-base font-bold text-foreground truncate mb-0.5">
                    {highlightMatch(title, query)}
                </h3>
                {description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                        {highlightMatch(description, query)}
                    </p>
                )}
            </div>

            {/* Desktop Tags */}
            <div className="hidden md:flex items-center gap-2 mr-4">
                {tags?.slice(0, 2).map((tag) => (
                    <span
                        key={tag}
                        className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
