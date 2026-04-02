import { useState, KeyboardEvent } from 'react';
import { Send, X, FileCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatType } from '@/domains/study/types/chat';

interface ChatInputProps {
  onSend: (message: string) => void;
  pendingCodeShare?: {
    code: string;
    language: string;
    ownerName?: string;
    isRealtime?: boolean;
    problemTitle?: string;
    problemId?: number;
    externalId?: string;
  } | null;
  onCancelShare?: () => void;
  replyingTo?: {
    id: string;
    senderId: number;
    senderName: string;
    content: string;
    type: ChatType;
  } | null;
  onCancelReply?: () => void;
}

export function ChatInput({
  onSend,
  pendingCodeShare,
  onCancelShare,
  replyingTo,
  onCancelReply,
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <div className="min-h-[3.5rem] border-t bg-background px-3 py-2 flex flex-col justify-center">
      {replyingTo && (
        <div
          data-testid="reply-preview"
          className="mb-2 flex items-center gap-2 rounded-md border border-amber-200/70 bg-amber-50 p-2 text-xs dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <span className="flex-1 truncate font-medium text-amber-900 dark:text-amber-100">
            {replyingTo.senderName} : {replyingTo.content || 'Code share'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancelReply}
            title="Cancel reply"
            aria-label="Cancel reply"
            data-testid="cancel-reply-button"
          >
            <X size={12} />
          </Button>
        </div>
      )}

      {pendingCodeShare && (
        <div
          data-testid="pending-code-share"
          className="mb-2 flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-xs animate-in slide-in-from-bottom-2"
        >
          <FileCode size={14} className="text-primary" />
          <span className="flex-1 truncate font-mono">
            {(pendingCodeShare.externalId || pendingCodeShare.problemId) && (
              <span className="mr-1">
                [#{pendingCodeShare.externalId || pendingCodeShare.problemId}]
              </span>
            )}
            {pendingCodeShare.problemTitle ? `${pendingCodeShare.problemTitle} ` : 'Code '}(
            {pendingCodeShare.language})
            {pendingCodeShare.ownerName ? ` - ${pendingCodeShare.ownerName}` : ''}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancelShare}
            title="Cancel code share"
            aria-label="Cancel code share"
          >
            <X size={12} />
          </Button>
        </div>
      )}

      <div className="relative w-full">
        <textarea
          id="chat-input"
          className="flex min-h-[40px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={pendingCodeShare ? 'Describe this code share...' : 'Type a message...'}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          variant="ghost"
          className="absolute bottom-1 right-1 h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
