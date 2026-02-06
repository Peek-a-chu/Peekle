import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import type { User as SearchUser } from '@/api/searchApi';
import { TIER_COLORS } from './search.constants';
import { highlightMatch } from './search.constants';

interface UserGridItemProps {
    result: SearchUser;
    query: string;
    onClick: () => void;
}

export function UserGridItem({ result, query, onClick }: UserGridItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center p-5 bg-card rounded-2xl border border-border h-[132px] hover:border-primary transition-colors cursor-pointer gap-4 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]"
        >
            <UserIcon
                src={result.profileImg}
                nickname={result.handle}
                size={48}
                className="border-border"
            />
            <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground truncate">
                        {highlightMatch(result.handle, query)}
                    </h3>
                    <span
                        className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold',
                            TIER_COLORS[result.tier]?.bg || 'bg-muted',
                            TIER_COLORS[result.tier]?.text || 'text-muted-foreground',
                        )}
                    ></span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-muted-foreground">
                        {result.league}
                    </p>
                </div>
            </div>
        </div>
    );
}
