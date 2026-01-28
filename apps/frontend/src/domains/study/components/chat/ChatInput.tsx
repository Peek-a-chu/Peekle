import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X, FileCode } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  pendingCodeShare?: {
    code: string;
    language: string;
    ownerName?: string;
    isRealtime?: boolean;
  } | null;
  onCancelShare?: () => void;
}

export function ChatInput({ onSend, pendingCodeShare, onCancelShare }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="p-3 border-t bg-background">
      {pendingCodeShare && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-md border text-xs animate-in slide-in-from-bottom-2">
          <FileCode size={14} className="text-primary" />
          <span className="font-mono truncate flex-1">
            Code ({pendingCodeShare.language})
            {pendingCodeShare.ownerName ? ` - ${pendingCodeShare.ownerName}` : ''}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancelShare}
            title="취소"
          >
            <X size={12} />
          </Button>
        </div>
      )}
      <div className="relative">
        <textarea
          id="chat-input"
          className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-10"
          placeholder={
            pendingCodeShare ? '코드에 대한 설명을 입력하세요...' : '메시지를 입력하세요...'
          }
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={handleSend}
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
