import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import ProblemIcon from '@/assets/icons/problem.svg';
import BookIcon from '@/assets/icons/book.svg';
import PeopleIcon from '@/assets/icons/people.svg';
import type { SearchSuggestion } from './useSearchSuggestions';

interface SearchDropdownProps {
    suggestions: SearchSuggestion[];
    isLoading: boolean;
    selectedIndex: number;
    onSelect: (suggestion: SearchSuggestion) => void;
}

export function SearchDropdown({
    suggestions,
    isLoading,
    selectedIndex,
    onSelect,
}: SearchDropdownProps) {
    const getSuggestionIcon = (suggestion: SearchSuggestion) => {
        switch (suggestion.type) {
            case 'problem':
                return <ProblemIcon className="h-5 w-5" />;
            case 'user':
                return suggestion.profileImg ? (
                    <UserIcon src={suggestion.profileImg} nickname={suggestion.title} size={20} />
                ) : (
                    <PeopleIcon className="h-5 w-5" />
                );
            case 'workbook':
                return <BookIcon className="h-5 w-5" />;
            default:
                return null;
        }
    };

    const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
        switch (type) {
            case 'problem':
                return '문제';
            case 'user':
                return '사용자';
            case 'workbook':
                return '문제집';
            default:
                return '';
        }
    };

    if (isLoading) {
        return (
            <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-input bg-background shadow-lg">
                <div className="p-4 text-center text-sm text-muted-foreground">검색 중...</div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-input bg-background shadow-lg">
            <div className="max-h-[400px] overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        type="button"
                        onClick={() => onSelect(suggestion)}
                        className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-none',
                            selectedIndex === index ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground',
                        )}
                    >
                        <span className="flex-shrink-0">{getSuggestionIcon(suggestion)}</span>
                        <div className="flex-1">
                            <div className="font-medium">
                                {suggestion.type === 'problem' && suggestion.externalId && (
                                    <span className="text-primary mr-1.5 break-normal">
                                        #{suggestion.externalId}
                                    </span>
                                )}
                                {suggestion.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {getSuggestionTypeLabel(suggestion.type)}
                                {suggestion.tier && ` · ${suggestion.tier}`}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
