import BookIcon from '@/assets/icons/book.svg';
import type { Workbook } from '@/api/searchApi';
import { highlightMatch } from './search.constants';

interface WorkbookGridItemProps {
    result: Workbook;
    query: string;
    onClick: () => void;
}

export function WorkbookGridItem({ result, query, onClick }: WorkbookGridItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex flex-col p-5 bg-card rounded-2xl border border-border h-full hover:border-primary transition-colors cursor-pointer shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] outline-none"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BookIcon className="h-5 w-5" />
                </div>
                <h3 className="flex-1 text-base font-bold text-foreground line-clamp-1">
                    {highlightMatch(result.title, query)}
                </h3>
            </div>

            {result.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-3">
                    {highlightMatch(result.description, query)}
                </p>
            )}

            <div className="text-xs font-medium text-muted-foreground mb-3">
                총 {result.problemCount || 0}문제
            </div>
        </div>
    );
}
