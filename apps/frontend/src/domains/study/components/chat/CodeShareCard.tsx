import { cn } from '@/lib/utils';
import { FileCode2, BookOpen, User } from 'lucide-react';

interface CodeShareCardProps {
  code: string; // Still needed for logic, but maybe not display
  language?: string;
  problemTitle?: string;
  ownerName?: string;
  onClick?: () => void;
  className?: string;
}

export function CodeShareCard({
  code,
  language,
  problemTitle,
  ownerName,
  onClick,
  className,
}: CodeShareCardProps): React.ReactNode {
  // Use code variable to satisfy unused-vars if necessary, though it's intended for the parent's onClick logic usually
  console.debug('CodeShareCard for code length:', code.length);

  return (
    <div
      className={cn(
        'border rounded-md bg-card overflow-hidden text-left shadow-sm transition-colors',
        onClick && 'cursor-pointer hover:border-primary/50',
        className,
      )}
      onClick={onClick}
    >
      <div className="bg-muted px-3 py-2 text-xs flex items-center justify-between text-muted-foreground border-b">
        <div className="flex items-center gap-2">
          <FileCode2 size={12} />
          <span className="font-semibold text-foreground">{language || 'Code'}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span>Click to view</span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen size={16} className="text-primary shrink-0" />
          <span className="truncate">{problemTitle || 'No Problem Selected'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User size={14} className="shrink-0" />
          <span>{ownerName || 'Anonymous'}</span>
        </div>
      </div>
    </div>
  );
}
