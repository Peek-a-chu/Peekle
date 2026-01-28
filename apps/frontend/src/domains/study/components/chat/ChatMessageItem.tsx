import { ChatMessage } from '../../types/chat';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { CodeShareCard } from './CodeShareCard';
import { useRoomStore } from '../../hooks/useRoomStore';

interface ChatMessageItemProps {
  message: ChatMessage;
  isMine: boolean;
}

export function ChatMessageItem({ message, isMine }: ChatMessageItemProps) {
  const { viewSharedCode, resetToOnlyMine, participants, viewRealtimeCode, currentUserId } =
    useRoomStore();

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const handleCodeClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Show the shared code in split view
    if (message.type === 'CODE' && message.metadata?.code) {
      const { ownerName } = message.metadata;

      // 1. Determine Realtime Intent First
      let isRealtimeShare = message.metadata.isRealtime;

      // [Safe Guard] If undefined, infer from ownerName (Legacy support)
      if (isRealtimeShare === undefined) {
        // If name indicates saved code, treat as snapshot
        if (ownerName && ownerName.includes('저장된 코드')) {
          isRealtimeShare = false;
        } else {
          isRealtimeShare = true;
        }
      }

      // 2. If share type is explicitly NOT realtime (Snapshot), show SPLIT_SAVED immediately
      if (isRealtimeShare === false) {
        let displayOwnerName = ownerName || message.senderName;
        if (displayOwnerName === 'Me') {
          displayOwnerName = message.senderName;
        }

        viewSharedCode({
          code: message.metadata.code,
          language: message.metadata.language || 'python',
          ownerName: displayOwnerName,
          problemTitle: message.metadata.problemTitle,
        });
        return;
      }

      // 3. Determine the effective owner participant for Realtime View
      let targetParticipant = undefined;

      if (ownerName === 'Me') {
        // Owner is the sender
        targetParticipant = participants.find((p) => Number(p.id) === Number(message.senderId));
      } else {
        // Owner is someone else (by nickname)
        targetParticipant = participants.find((p) => p.nickname === ownerName);
      }

      // If the target is Me -> Reset to Only Mine
      if (targetParticipant && Number(targetParticipant.id) === Number(currentUserId)) {
        resetToOnlyMine();
        return;
      }

      // 4. Try to view real-time code (SPLIT_REALTIME)
      if (targetParticipant) {
        viewRealtimeCode(targetParticipant);
      } else {
        // Fallback to snapshot if participant is not currently in the room (SPLIT_SAVED)
        let displayOwnerName = ownerName || message.senderName;
        if (displayOwnerName === 'Me') {
          displayOwnerName = message.senderName;
        }

        viewSharedCode({
          code: message.metadata.code,
          language: message.metadata.language || 'python',
          ownerName: displayOwnerName,
          problemTitle: message.metadata.problemTitle,
        });
      }
    }
  };

  return (
    <div
      id={`chat-msg-${message.id}`}
      className={cn(
        'flex flex-col mb-4 group max-w-[85%] scroll-mt-20 transition-all duration-300',
        isMine ? 'self-end items-end' : 'self-start items-start',
      )}
    >
      {!isMine && (
        <span className="text-xs text-muted-foreground mb-1 ml-1">{message.senderName}</span>
      )}

      <div className="flex items-center gap-2 max-w-full">
        <div
          className={cn(
            'px-3 py-2 rounded-lg text-sm break-all',
            isMine
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-muted rounded-tl-none',
            message.type === 'CODE' && 'cursor-pointer',
          )}
          onClick={message.type === 'CODE' ? handleCodeClick : undefined}
        >
          {message.type === 'CODE' && message.metadata?.code ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <CodeShareCard
                code={message.metadata.code}
                language={message.metadata.language}
                problemTitle={message.metadata.problemTitle}
                ownerName={message.metadata.ownerName}
                // Removed onClick from here to prevent double triggering with parent div
                className={
                  isMine ? 'bg-primary-foreground/10 border-primary-foreground/20' : 'bg-background'
                }
              />
              {message.content && <span>{message.content}</span>}
            </div>
          ) : (
            <div className={cn('markdown-prose', isMine && 'markdown-prose-invert')}>
              <ReactMarkdown
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  a: ({ node, ...props }) => (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <a {...(props as any)} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
