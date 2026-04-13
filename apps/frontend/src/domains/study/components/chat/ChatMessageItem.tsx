import { useRef, useState } from 'react';
import { Check, Copy, Reply } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { Button } from '@/components/ui/button';
import { useIsTouchMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { useRoomStore } from '../../hooks/useRoomStore';
import type { ChatMessage } from '../../types/chat';
import { CodeShareCard } from './CodeShareCard';

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-amber-400', 'ring-offset-2', 'ring-offset-background'];

const normalizeSharedDisplayContent = (message: ChatMessage) => {
  if (message.type !== 'CODE') {
    return message.content;
  }

  return message.content
    .replace(/^\[CODE:[^\]]+\]\s*/i, '')
    .replace(/\s*Ref:.*$/i, '');
};

const PreBlock = ({ children, ...props }: any) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preRef.current) {
      const codeText = preRef.current.innerText || '';
      navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="group/code relative my-2 overflow-hidden rounded-md border border-white/10 bg-zinc-950/90 text-left">
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover/code:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Copy code block"
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre ref={preRef} className="overflow-x-auto p-4 font-mono text-xs text-zinc-50" {...props}>
        {children}
      </pre>
    </div>
  );
};

interface ChatMessageItemProps {
  message: ChatMessage;
  isMine: boolean;
  messageLookup?: Record<string, ChatMessage>;
}

export function ChatMessageItem({ message, isMine, messageLookup }: ChatMessageItemProps) {
  const isTouchMobile = useIsTouchMobile();
  const viewSharedCode = useRoomStore((state) => state.viewSharedCode);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);
  const participants = useRoomStore((state) => state.participants);
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);
  const setReplyingTo = useRoomStore((state) => state.setReplyingTo);

  if (message.type === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const isRefCodeMessage = message.type === 'CODE' && !!message.metadata;
  const displayContent = normalizeSharedDisplayContent(message);

  const focusChatInput = () => {
    const chatInput = document.getElementById('chat-input');
    chatInput?.focus();
  };

  const highlightOriginalMessage = (messageId: string) => {
    const originalMessage = document.getElementById(`chat-msg-${messageId}`);
    if (!originalMessage) return;

    originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    originalMessage.classList.add(...HIGHLIGHT_CLASSES);

    window.setTimeout(() => {
      originalMessage.classList.remove(...HIGHLIGHT_CLASSES);
    }, 2000);
  };

  const activateCodeView = (targetMessage: ChatMessage) => {
    if (targetMessage.type !== 'CODE' || !targetMessage.metadata) return;

    const { ownerName } = targetMessage.metadata;
    let isRealtimeShare = targetMessage.metadata.isRealtime;

    if (isRealtimeShare === undefined) {
      if (ownerName && ownerName.includes('saved code')) {
        isRealtimeShare = false;
      } else {
        isRealtimeShare = true;
      }
    }

    if (isRealtimeShare === false) {
      let displayOwnerName = ownerName || targetMessage.senderName;
      if (displayOwnerName === 'Me') {
        displayOwnerName = targetMessage.senderName;
      }

      viewSharedCode({
        code: targetMessage.metadata.code || '',
        language: targetMessage.metadata.language || 'python',
        ownerName: displayOwnerName,
        problemTitle: targetMessage.metadata.problemTitle,
        problemId: targetMessage.metadata.problemId,
        externalId: targetMessage.metadata.externalId,
        isRealtime: false,
      });
      return;
    }

    let targetParticipant;

    if (ownerName === 'Me') {
      targetParticipant = participants.find(
        (participant) => Number(participant.id) === Number(targetMessage.senderId),
      );
    } else {
      targetParticipant = participants.find((participant) => participant.nickname === ownerName);
    }

    if (targetMessage.metadata.problemId) {
      setSelectedProblem(
        targetMessage.metadata.problemId,
        null,
        targetMessage.metadata.problemTitle || '',
        targetMessage.metadata.externalId,
      );
    }

    if (targetParticipant && Number(targetParticipant.id) === Number(currentUserId)) {
      resetToOnlyMine();
      return;
    }

    if (targetParticipant) {
      viewRealtimeCode(targetParticipant);
      return;
    }

    let displayOwnerName = ownerName || targetMessage.senderName;
    if (displayOwnerName === 'Me') {
      displayOwnerName = targetMessage.senderName;
    }

    viewSharedCode({
      code: targetMessage.metadata.code || '',
      language: targetMessage.metadata.language || 'python',
      ownerName: displayOwnerName,
      problemTitle: targetMessage.metadata.problemTitle,
      problemId: targetMessage.metadata.problemId,
      externalId: targetMessage.metadata.externalId,
    });
  };

  const handleCodeClick = (e?: React.MouseEvent, targetMessage: ChatMessage = message) => {
    e?.stopPropagation();
    activateCodeView(targetMessage);
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.id) return;

    setReplyingTo({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      content: displayContent,
      type: message.type,
    });

    focusChatInput();

    if (isRefCodeMessage) {
      activateCodeView(message);
    }
  };

  const handleReferenceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.parentMessage?.id) return;

    highlightOriginalMessage(message.parentMessage.id);

    const originalMessage = messageLookup?.[message.parentMessage.id];
    if (originalMessage?.type === 'CODE' && originalMessage.metadata) {
      activateCodeView(originalMessage);
    }
  };

  const referenceLabel = message.parentMessage
    ? `${message.parentMessage.senderName}: ${
        message.parentMessage.content || (message.parentMessage.type === 'CODE' ? 'Code share' : '')
      }`
    : null;

  return (
    <div
      id={`chat-msg-${message.id}`}
      className={cn(
        'group mb-4 flex max-w-[85%] scroll-mt-20 flex-col transition-all duration-300',
        isMine ? 'self-end items-end' : 'self-start items-start',
      )}
    >
      {!isMine && (
        <span className="mb-1 ml-1 text-xs text-muted-foreground">{message.senderName}</span>
      )}

      <div className="flex max-w-full items-start gap-2">
        {isMine && message.id && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReplyClick}
            title="Reply"
            aria-label="Reply"
            data-testid={`reply-button-${message.id}`}
            className={cn(
              'order-first h-8 w-8 shrink-0 transition-opacity',
              isTouchMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <Reply className="h-4 w-4" />
          </Button>
        )}

        <div
          className={cn(
            'text-sm break-all',
            isRefCodeMessage
              ? 'cursor-pointer px-0 py-0'
              : isMine
                ? 'rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-primary-foreground'
                : 'rounded-2xl rounded-tl-md bg-muted px-3 py-2 text-foreground',
          )}
          onClick={isRefCodeMessage ? (e) => handleCodeClick(e, message) : undefined}
        >
          {message.parentMessage && referenceLabel && (
            <button
              type="button"
              onClick={handleReferenceClick}
              data-testid={`chat-reference-${message.id}`}
              className={cn(
                'mb-2 flex w-full items-center rounded-lg border px-2 py-1 text-left text-xs transition-colors',
                isMine
                  ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/90 hover:bg-primary-foreground/15'
                  : 'border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <span className="truncate">{referenceLabel}</span>
            </button>
          )}

          {isRefCodeMessage && message.metadata ? (
            <div className="flex max-w-md min-w-[220px] flex-col gap-2">
              <CodeShareCard
                code={message.metadata.code || ''}
                language={message.metadata.language}
                problemTitle={message.metadata.problemTitle}
                ownerName={message.metadata.ownerName}
                problemId={message.metadata.problemId}
                externalId={message.metadata.externalId}
                onClick={(e) => handleCodeClick(e, message)}
                className={
                  isMine ? 'border-primary-foreground/20 bg-primary-foreground/10' : 'bg-background'
                }
              />
              {displayContent && (
                <span className="whitespace-pre-line text-xs text-muted-foreground">
                  {displayContent}
                </span>
              )}
            </div>
          ) : (
            <div className={cn('markdown-prose', isMine && 'markdown-prose-invert')}>
              <ReactMarkdown
                components={{
                  pre: PreBlock,
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !match ? (
                      <code
                        className={cn(
                          'rounded bg-black/10 px-1 font-mono text-sm dark:bg-white/10',
                          className,
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  a: ({ ...props }) => (
                    <a {...(props as any)} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isMine && message.id && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReplyClick}
            title="Reply"
            aria-label="Reply"
            data-testid={`reply-button-${message.id}`}
            className={cn(
              'h-8 w-8 shrink-0 transition-opacity',
              isTouchMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <Reply className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
