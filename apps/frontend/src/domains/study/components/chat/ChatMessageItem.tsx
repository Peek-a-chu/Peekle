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
  const {
    viewSharedCode,
    resetToOnlyMine,
    participants,
    viewRealtimeCode,
    currentUserId,
    setSelectedProblem, // Import
  } = useRoomStore();

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
    if (message.type === 'CODE' && message.metadata) {
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

      // [Feature] Set Selected Problem if metadata has problemId, regardless of target
      if (message.metadata.problemId) {
        setSelectedProblem(message.metadata.problemId, message.metadata.problemTitle || '');
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

  const isRefCodeMessage = message.type === 'CODE' && !!message.metadata;

  const displayContent =
    isRefCodeMessage && message.content
      ? message.content
          // Strip leading [CODE:lang] prefix
          .replace(/^\[CODE:[^\]]+\]\s*/i, '')
          // Strip trailing "Ref: ..." part
          .replace(/\s*Ref:.*$/i, '')
      : message.content;

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
            'text-sm break-all',
            isRefCodeMessage
              ? 'px-0 py-0'
              : isMine
                ? 'px-3 py-2 rounded-2xl bg-primary text-primary-foreground rounded-tr-md'
                : 'px-3 py-2 rounded-2xl bg-muted text-foreground rounded-tl-md',
            isRefCodeMessage && 'cursor-pointer',
          )}
          onClick={isRefCodeMessage ? handleCodeClick : undefined}
        >
          {isRefCodeMessage && message.metadata ? (
            <div className="flex flex-col gap-2 min-w-[220px] max-w-md">
              <CodeShareCard
                code={message.metadata.code || ''}
                language={message.metadata.language}
                problemTitle={message.metadata.problemTitle}
                ownerName={message.metadata.ownerName}
                problemId={message.metadata.problemId}
                onClick={handleCodeClick}
                className={
                  isMine ? 'bg-primary-foreground/10 border-primary-foreground/20' : 'bg-background'
                }
              />
              {displayContent && (
                <span className="text-xs text-muted-foreground whitespace-pre-line">
                  {displayContent}
                </span>
              )}
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
