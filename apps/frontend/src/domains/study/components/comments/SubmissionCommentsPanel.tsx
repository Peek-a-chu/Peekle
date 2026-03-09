'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, ArrowDown, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

interface SubmissionCommentItem {
  id: number;
  submissionId: number;
  parentId: number | null;
  type: 'INLINE' | 'GENERAL';
  isDeleted: boolean;
  authorId: number;
  authorNickname: string;
  authorProfileImage?: string | null;
  lineStart: number;
  lineEnd: number;
  content: string;
  createdAt: string;
}

function formatCommentDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SubmissionCommentsPanel() {
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const viewMode = useRoomStore((state) => state.viewMode);
  const targetSubmission = useRoomStore((state) => state.targetSubmission);

  const submissionId = targetSubmission?.submissionId ?? null;
  const canShowComments = viewMode === 'SPLIT_SAVED' && !!roomId && !!submissionId;

  const [comments, setComments] = useState<SubmissionCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [inlineReplyParentId, setInlineReplyParentId] = useState<number | null>(null);
  const [inlineReplyContent, setInlineReplyContent] = useState('');
  const [isPostingInlineReply, setIsPostingInlineReply] = useState(false);
  const [generalReplyParentId, setGeneralReplyParentId] = useState<number | null>(null);
  const [generalReplyContent, setGeneralReplyContent] = useState('');
  const [generalCommentContent, setGeneralCommentContent] = useState('');
  const [isPostingGeneralComment, setIsPostingGeneralComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!canShowComments || !roomId || !submissionId) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch<SubmissionCommentItem[]>(
        `/api/studies/${roomId}/submissions/${submissionId}/comments`,
      );

      if (!response.success || !Array.isArray(response.data)) {
        setComments([]);
        return;
      }

      setComments(response.data);
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [canShowComments, roomId, submissionId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const handleLineSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ lineNumber?: number }>).detail;
      if (!detail?.lineNumber) return;
      setSelectedLine(detail.lineNumber);
    };

    const handleRefreshRequested = () => {
      void fetchComments();
    };

    window.addEventListener('peekle:select-comment-line', handleLineSelected as EventListener);
    window.addEventListener('peekle:refresh-submission-comments', handleRefreshRequested);

    return () => {
      window.removeEventListener('peekle:select-comment-line', handleLineSelected as EventListener);
      window.removeEventListener('peekle:refresh-submission-comments', handleRefreshRequested);
    };
  }, [fetchComments]);

  useEffect(() => {
    if (!selectedLine) return;
    const targetCard = document.querySelector<HTMLElement>(`[data-comment-line="${selectedLine}"]`);
    if (!targetCard) return;
    targetCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedLine, comments.length]);

  const filteredComments = useMemo(() => {
    if (!showOnlyMine || !currentUserId) return comments;
    return comments.filter((comment) => comment.authorId === currentUserId);
  }, [comments, showOnlyMine, currentUserId]);

  const inlineComments = useMemo(
    () => filteredComments.filter((comment) => comment.type === 'INLINE'),
    [filteredComments],
  );

  const inlineRootComments = useMemo(
    () => inlineComments.filter((comment) => !comment.parentId),
    [inlineComments],
  );

  const inlineRepliesByParent = useMemo(() => {
    const map = new Map<number, SubmissionCommentItem[]>();
    inlineComments.forEach((comment) => {
      if (!comment.parentId) return;
      const bucket = map.get(comment.parentId) || [];
      bucket.push(comment);
      map.set(comment.parentId, bucket);
    });
    return map;
  }, [inlineComments]);

  const generalComments = useMemo(
    () => filteredComments.filter((comment) => comment.type === 'GENERAL'),
    [filteredComments],
  );

  const generalRootComments = useMemo(
    () => generalComments.filter((comment) => !comment.parentId),
    [generalComments],
  );

  const generalRepliesByParent = useMemo(() => {
    const map = new Map<number, SubmissionCommentItem[]>();
    generalComments.forEach((comment) => {
      if (!comment.parentId) return;
      const bucket = map.get(comment.parentId) || [];
      bucket.push(comment);
      map.set(comment.parentId, bucket);
    });
    return map;
  }, [generalComments]);

  const sortedInlineLines = useMemo(() => {
    const unique = new Set<number>();
    inlineRootComments.forEach((comment) => {
      unique.add(Math.max(1, comment.lineStart || 1));
    });
    return Array.from(unique).sort((a, b) => a - b);
  }, [inlineRootComments]);

  const jumpToLine = useCallback((lineNumber: number, openDraft = false, parentId?: number | null) => {
    setSelectedLine(lineNumber);
    window.dispatchEvent(
      new CustomEvent('peekle:focus-saved-comment-line', {
        detail: {
          lineNumber,
          openDraft,
          parentId: parentId ?? null,
        },
      }),
    );
  }, []);

  const moveToNextComment = useCallback(() => {
    if (sortedInlineLines.length === 0) return;

    if (!selectedLine) {
      jumpToLine(sortedInlineLines[0]);
      return;
    }

    const currentIndex = sortedInlineLines.findIndex((line) => line === selectedLine);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % sortedInlineLines.length;
    jumpToLine(sortedInlineLines[nextIndex]);
  }, [jumpToLine, selectedLine, sortedInlineLines]);

  const handleCreateInlineReply = useCallback(async (parentComment: SubmissionCommentItem) => {
    if (!canShowComments || !roomId || !submissionId) return;
    if (parentComment.type !== 'INLINE') return;

    const trimmed = inlineReplyContent.trim();
    if (!trimmed) return;

    const lineNumber = Math.max(1, parentComment.lineStart || 1);
    setIsPostingInlineReply(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${submissionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'INLINE',
            parentId: parentComment.id,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            content: trimmed,
          }),
        },
      );

      if (!response.success) return;

      setInlineReplyContent('');
      setInlineReplyParentId(null);
      await fetchComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } finally {
      setIsPostingInlineReply(false);
    }
  }, [
    canShowComments,
    roomId,
    submissionId,
    inlineReplyContent,
    fetchComments,
  ]);

  const handleCreateGeneralComment = useCallback(async () => {
    if (!canShowComments || !roomId || !submissionId) return;

    const trimmed = generalCommentContent.trim();
    if (!trimmed) return;

    setIsPostingGeneralComment(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${submissionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'GENERAL',
            parentId: null,
            content: trimmed,
          }),
        },
      );

      if (!response.success) return;

      setGeneralCommentContent('');
      await fetchComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } finally {
      setIsPostingGeneralComment(false);
    }
  }, [
    canShowComments,
    roomId,
    submissionId,
    generalCommentContent,
    fetchComments,
  ]);

  const handleCreateGeneralReply = useCallback(async (parentComment: SubmissionCommentItem) => {
    if (!canShowComments || !roomId || !submissionId) return;
    if (parentComment.type !== 'GENERAL') return;

    const trimmed = generalReplyContent.trim();
    if (!trimmed) return;

    setIsPostingGeneralComment(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${submissionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'GENERAL',
            parentId: parentComment.id,
            content: trimmed,
          }),
        },
      );

      if (!response.success) return;

      setGeneralReplyContent('');
      setGeneralReplyParentId(null);
      await fetchComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } finally {
      setIsPostingGeneralComment(false);
    }
  }, [
    canShowComments,
    roomId,
    submissionId,
    generalReplyContent,
    fetchComments,
  ]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!canShowComments || !roomId || !submissionId) return;

    setDeletingCommentId(commentId);
    try {
      const response = await apiFetch<null>(
        `/api/studies/${roomId}/submissions/${submissionId}/comments/${commentId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.success) return;

      if (inlineReplyParentId === commentId) {
        setInlineReplyParentId(null);
        setInlineReplyContent('');
      }
      if (generalReplyParentId === commentId) {
        setGeneralReplyParentId(null);
        setGeneralReplyContent('');
      }

      await fetchComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } finally {
      setDeletingCommentId(null);
    }
  }, [
    canShowComments,
    roomId,
    submissionId,
    inlineReplyParentId,
    generalReplyParentId,
    fetchComments,
  ]);

  if (!canShowComments) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">저장 코드 보기에서 댓글을 확인할 수 있어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 px-3 border-b border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          인라인 {inlineComments.length} · 일반 {generalComments.length}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              'text-[11px] px-2 py-1 rounded border',
              showOnlyMine
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setShowOnlyMine((prev) => !prev)}
          >
            내 댓글만
          </button>
          <button
            type="button"
            className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            onClick={moveToNextComment}
            disabled={sortedInlineLines.length === 0}
          >
            <ArrowDown className="h-3 w-3" />
            다음 댓글
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">댓글 불러오는 중...</p>
        ) : (
          <>
            <section className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">라인 댓글</h4>
              {inlineRootComments.length === 0 ? (
                <p className="text-xs text-muted-foreground">라인 댓글이 없습니다.</p>
              ) : (
                inlineRootComments.map((comment) => {
                  const replies = inlineRepliesByParent.get(comment.id) || [];
                  const lineNumber = Math.max(1, comment.lineStart || 1);
                  return (
                    <div
                      key={comment.id}
                      data-comment-line={lineNumber}
                      className={cn(
                        'rounded-md border border-border bg-card px-2 py-2',
                        selectedLine === lineNumber && 'border-primary/70 ring-1 ring-primary/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-foreground hover:text-primary"
                          onClick={() => jumpToLine(lineNumber)}
                        >
                          L{lineNumber}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {comment.authorNickname} · {formatCommentDate(comment.createdAt)}
                          </span>
                          {!comment.isDeleted && currentUserId === comment.authorId && (
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground hover:text-foreground"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => void handleDeleteComment(comment.id)}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-foreground whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => jumpToLine(lineNumber)}
                        >
                          코드로 이동
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setInlineReplyParentId(comment.id);
                            setInlineReplyContent('');
                            jumpToLine(lineNumber);
                          }}
                        >
                          답글 작성
                        </button>
                        {replies.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            답글 {replies.length}
                          </span>
                        )}
                      </div>
                      {inlineReplyParentId === comment.id && (
                        <div className="mt-2 rounded border border-border/70 bg-muted/20 p-2 space-y-2">
                          <textarea
                            value={inlineReplyContent}
                            onChange={(event) => setInlineReplyContent(event.target.value)}
                            placeholder={`L${lineNumber} 답글을 입력하세요`}
                            className="w-full h-16 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setInlineReplyParentId(null);
                                setInlineReplyContent('');
                              }}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="text-[11px] px-2 py-1 rounded border border-primary bg-primary text-primary-foreground disabled:opacity-60"
                              disabled={isPostingInlineReply || !inlineReplyContent.trim()}
                              onClick={() => void handleCreateInlineReply(comment)}
                            >
                              등록
                            </button>
                          </div>
                        </div>
                      )}
                      {replies.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {replies.map((reply) => (
                            <button
                              key={reply.id}
                              type="button"
                              className="block w-full rounded border border-border/60 bg-muted/20 px-2 py-1.5 text-left hover:bg-muted/30"
                              onClick={() => jumpToLine(lineNumber)}
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                <span>{reply.authorNickname} · {formatCommentDate(reply.createdAt)}</span>
                                {!reply.isDeleted && currentUserId === reply.authorId && (
                                  <button
                                    type="button"
                                    className="text-[11px] text-muted-foreground hover:text-foreground"
                                    disabled={deletingCommentId === reply.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDeleteComment(reply.id);
                                    }}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                              <p className="mt-1 text-xs whitespace-pre-wrap break-words text-foreground">
                                {reply.content}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">일반 댓글</h4>
              {generalRootComments.length === 0 ? (
                <p className="text-xs text-muted-foreground">일반 댓글이 없습니다.</p>
              ) : (
                generalRootComments.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border bg-card p-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{comment.authorNickname} · {formatCommentDate(comment.createdAt)}</span>
                      {!comment.isDeleted && currentUserId === comment.authorId && (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          disabled={deletingCommentId === comment.id}
                          onClick={() => void handleDeleteComment(comment.id)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs whitespace-pre-wrap break-words text-foreground">
                      {comment.content}
                    </p>
                    {!comment.isDeleted && (
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        onClick={() => {
                          setGeneralReplyParentId(comment.id);
                          setGeneralReplyContent('');
                        }}
                      >
                        <CornerDownRight className="h-3 w-3" />
                        답글
                      </button>
                    )}
                    {generalReplyParentId === comment.id && (
                      <div className="mt-2 rounded border border-border/70 bg-muted/20 p-2 space-y-2">
                        <textarea
                          value={generalReplyContent}
                          onChange={(event) => setGeneralReplyContent(event.target.value)}
                          placeholder="답글을 입력하세요"
                          className="w-full h-16 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setGeneralReplyParentId(null);
                              setGeneralReplyContent('');
                            }}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            className="text-[11px] px-2 py-1 rounded border border-primary bg-primary text-primary-foreground disabled:opacity-60"
                            disabled={isPostingGeneralComment || !generalReplyContent.trim()}
                            onClick={() => void handleCreateGeneralReply(comment)}
                          >
                            등록
                          </button>
                        </div>
                      </div>
                    )}
                    {(generalRepliesByParent.get(comment.id) || []).map((reply) => (
                      <div key={reply.id} className="mt-2 ml-3 rounded border border-border/60 bg-muted/20 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>{reply.authorNickname} · {formatCommentDate(reply.createdAt)}</span>
                          {!reply.isDeleted && currentUserId === reply.authorId && (
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground hover:text-foreground"
                              disabled={deletingCommentId === reply.id}
                              onClick={() => void handleDeleteComment(reply.id)}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs whitespace-pre-wrap break-words text-foreground">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            value={generalCommentContent}
            onChange={(event) => setGeneralCommentContent(event.target.value)}
            placeholder="일반 댓글을 입력하세요"
            className="w-full h-16 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            size="sm"
            className="h-8 px-2"
            disabled={isPostingGeneralComment || !generalCommentContent.trim()}
            onClick={() => void handleCreateGeneralComment()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
