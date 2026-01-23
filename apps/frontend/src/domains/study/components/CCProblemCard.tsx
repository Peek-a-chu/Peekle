'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Users, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Problem } from '@/domains/study/types';
import { Button } from '@/components/ui/button';
import { BoxSearchIcon } from '@/assets/icons/BoxSearchIcon';

interface CCProblemCardProps {
  problem: Problem;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpenSubmission?: (problemId: number) => void;
  className?: string; // Added className prop
}

export function CCProblemCard({
  problem,
  isSelected,
  onSelect,
  onOpenSubmission,
  className,
}: CCProblemCardProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect?.();
        }
      }}
      className={cn(
        'relative rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md cursor-pointer group',
        isSelected
          ? 'border-pink-500 ring-1 ring-pink-500 bg-pink-50/10'
          : 'border-border hover:border-pink-200',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-5 w-5 hover:bg-transparent z-10"
        onClick={(e) => {
          e.stopPropagation();
          setShowHint(!showHint);
        }}
        aria-label="toggle hint"
      >
        <Lightbulb
          className={cn(
            'h-3.5 w-3.5 transition-colors',
            showHint ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground',
          )}
        />
      </Button>

      {/* Top Row: Title & Icons */}
      <div className="flex flex-col gap-2 mb-2 w-full pr-6">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-sm line-clamp-1">
              {problem.number}. {problem.title}
            </span>
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
        </div>
        
        {/* Tags Row - Always Visible */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hint Area (Extra Info if needed, currently reusing tags logic which is now moved up, so we can remove or keep for hint specific stuff) */}
      {/* {showHint && ... } - Removed old tag display from here since it's moved up */}

      {/* Action Row */}
      <div className="flex items-center justify-between mt-2">
        {/* View Submission Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSubmission?.(problem.id);
          }}
          aria-label="view submissions"
        >
          <BoxSearchIcon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          {problem.status === 'completed' ? (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>풀이 완료</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground hidden group-hover:block">진행 중</div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {/* AC implies removing total count if I follow 'remove denominator' strictly, but visual shows 2/4. I'll stick to 2/4 for now as per wireframe text. */}
            <span>
              {problem.participantCount}/{problem.totalParticipants || 4}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
