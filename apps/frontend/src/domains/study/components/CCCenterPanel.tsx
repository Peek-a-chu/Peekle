'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { type ReactNode } from 'react';
import { useCenterPanel } from '@/domains/study/hooks/useCenterPanel';
import { CCVideoGrid as VideoGrid } from '@/domains/study/components/CCVideoGrid';
import { CCControlBar as ControlBar } from '@/domains/study/components/CCControlBar';
import { CCIDEPanel as IDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { CCConsolePanel } from '@/domains/study/components/CCConsolePanel';
import { useExecution } from '@/domains/study/hooks/useExecution';
import { WhiteboardPanel } from '@/domains/study/components/whiteboard/WhiteboardOverlay';
import { useRealtimeCode } from '@/domains/study/hooks/useRealtimeCode';
import { useSocket } from '@/domains/study/hooks/useSocket';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Lock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useIsTouchMobile } from '@/hooks/useIsMobile';

interface CCCenterPanelProps {
  ideContent?: ReactNode;
  onWhiteboardClick?: () => void;
  onMicToggle?: () => void;
  onVideoToggle?: () => void;
  onWhiteboardToggle?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

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

export function CCCenterPanel({
  ideContent,
  onWhiteboardClick,
  onMicToggle,
  onVideoToggle,
  onWhiteboardToggle,
  onSettingsClick,
  className,
}: CCCenterPanelProps) {
  const isMobile = useIsTouchMobile();

  const getTemplateCode = (languageValue: string): string => {
    const normalized = languageValue.toLowerCase();

    if (normalized.includes('java') && !normalized.includes('script')) {
      return `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // 코드를 작성해주세요
        System.out.println("Hello World!");
    }
}`;
    }

    if (normalized.includes('cpp') || normalized.includes('c++')) {
      return `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    // 코드를 작성해주세요
    cout << "Hello World!" << endl;
    return 0;
}`;
    }

    return `import sys

# 코드를 작성해주세요
print("Hello World!")`;
  };

  const normalizeLanguage = (languageValue: string): string => {
    const normalized = languageValue.toLowerCase();
    if (normalized.includes('java') && !normalized.includes('script')) return 'java';
    if (normalized.includes('cpp') || normalized.includes('c++')) return 'cpp';
    return 'python';
  };

  const getLanguageBadgeLabel = (languageValue: string): string => {
    const normalized = normalizeLanguage(languageValue);
    if (normalized === 'cpp') return 'C++';
    if (normalized === 'java') return 'Java';
    return 'Python';
  };

  const {
    isVideoGridFolded,
    toggleVideoGrid,
    viewMode,
    viewingUser,
    targetSubmission,
    resetToOnlyMine,
    language,
    setLanguage,
    theme,
    handleThemeToggle,
    leftPanelRef,
    isViewingOther,
    handleCopy,
    handleSubmit,
    handleRefChat,
  } = useCenterPanel();

  const { isExecuting, executionResult, executeCode } = useExecution();

  const {
    code: realtimeCode,
    language: realtimeLanguage,
    problemTitle: realtimeProblemTitle,
    problemExternalId: realtimeProblemExternalId,
  } = useRealtimeCode(
    viewMode === 'SPLIT_REALTIME' ? viewingUser : null,
  );
  const roomId = useRoomStore((state) => state.roomId);
  const mobileTab = useRoomStore((state) => state.mobileTab);
  const setMobileTab = useRoomStore((state) => state.setMobileTab);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const selectedProblemExternalId = useRoomStore((state) => state.selectedProblemExternalId);
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const socket = useSocket(roomId, currentUserId);
  const setRightPanelActiveTab = useRoomStore((state) => state.setRightPanelActiveTab);
  const setIsLeftPanelFolded = useRoomStore((state) => state.setIsLeftPanelFolded);
  const setIsRightPanelFolded = useRoomStore((state) => state.setIsRightPanelFolded);
  const targetSubmissionId = targetSubmission?.submissionId;

  const savedEditorRef = useRef<any>(null);
  const inlineZoneIdsRef = useRef<string[]>([]);
  const inlineDraftZoneIdRef = useRef<string | null>(null);
  const inlineMarkerDecorationIdsRef = useRef<string[]>([]);
  const inlineGlyphCountStyleRef = useRef<HTMLStyleElement | null>(null);
  const savedEditorContainerRef = useRef<HTMLElement | null>(null);
  const marginPointerListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
  const hoveredLineRef = useRef<number | null>(null);
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringAddButtonRef = useRef(false);

  const [submissionComments, setSubmissionComments] = useState<SubmissionCommentItem[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isPostingInlineComment, setIsPostingInlineComment] = useState(false);
  const [isPostingGeneralComment, setIsPostingGeneralComment] = useState(false);
  const [generalCommentContent, setGeneralCommentContent] = useState('');
  const [generalReplyParentId, setGeneralReplyParentId] = useState<number | null>(null);
  const [generalEditingCommentId, setGeneralEditingCommentId] = useState<number | null>(null);
  const [generalEditingContent, setGeneralEditingContent] = useState('');
  const [inlineDraftLine, setInlineDraftLine] = useState<number | null>(null);
  const [inlineDraftParentId, setInlineDraftParentId] = useState<number | null>(null);
  const [inlineEditingCommentId, setInlineEditingCommentId] = useState<number | null>(null);
  const [inlineEditingContent, setInlineEditingContent] = useState('');
  const [hoveredLineForAdd, setHoveredLineForAdd] = useState<number | null>(null);
  const [hoverAddButtonLeft, setHoverAddButtonLeft] = useState(0);
  const [hoverAddButtonTop, setHoverAddButtonTop] = useState(0);

  // Video Grid Resize State
  const [videoGridHeight, setVideoGridHeight] = useState(240);
  const [isResizingVideo, setIsResizingVideo] = useState(false);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // Console Panel State
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(250);
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  const consoleResizeStartY = useRef<number>(0);
  const consoleResizeStartHeight = useRef<number>(0);

  // Font Size State
  const [fontSize, setFontSize] = useState<number>(14);

  // Load font size from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ide-font-size');
      if (saved) {
        setFontSize(parseInt(saved, 10));
      }
    }
  }, []);

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    localStorage.setItem('ide-font-size', newSize.toString());
  };

  useEffect(() => {
    if (isMobile) {
      setVideoGridHeight(420);
    } else {
      setVideoGridHeight(240);
      setMobileTab('video');
    }
  }, [isMobile, setMobileTab]);

  // Auto-switch to code view on mobile when opening a code block
  useEffect(() => {
    if (isMobile && (viewMode === 'SPLIT_REALTIME' || viewMode === 'SPLIT_SAVED')) {
      setMobileTab('code');
    }
  }, [isMobile, viewMode, setMobileTab]);

  const formatCommentDate = useCallback((value?: string): string => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const clearInlineZones = useCallback(() => {
    const editor = savedEditorRef.current;
    if (!editor) return;

    editor.changeViewZones((accessor: any) => {
      inlineZoneIdsRef.current.forEach((zoneId) => accessor.removeZone(zoneId));
      if (inlineDraftZoneIdRef.current) {
        accessor.removeZone(inlineDraftZoneIdRef.current);
      }
    });
    inlineZoneIdsRef.current = [];
    inlineDraftZoneIdRef.current = null;
  }, []);

  const clearHoverHideTimer = useCallback(() => {
    if (!hoverHideTimerRef.current) return;
    clearTimeout(hoverHideTimerRef.current);
    hoverHideTimerRef.current = null;
  }, []);

  const hideHoverAddButton = useCallback(() => {
    hoveredLineRef.current = null;
    setHoveredLineForAdd(null);
  }, []);

  const focusSavedLine = useCallback((lineNumber: number) => {
    const editor = savedEditorRef.current;
    if (!editor) return;

    editor.revealLineInCenter(lineNumber);
    editor.setPosition({ lineNumber, column: 1 });
    editor.focus();
  }, []);

  const fetchSubmissionComments = useCallback(async () => {
    if (viewMode !== 'SPLIT_SAVED' || !roomId || !targetSubmissionId) {
      setSubmissionComments([]);
      return;
    }

    setIsCommentsLoading(true);
    try {
      const response = await apiFetch<SubmissionCommentItem[]>(
        `/api/studies/${roomId}/submissions/${targetSubmissionId}/comments`,
      );

      if (!response.success || !Array.isArray(response.data)) {
        setSubmissionComments([]);
        return;
      }

      setSubmissionComments(response.data);
    } catch {
      setSubmissionComments([]);
    } finally {
      setIsCommentsLoading(false);
    }
  }, [viewMode, roomId, targetSubmissionId]);

  const inlineComments = useMemo(
    () => submissionComments.filter((comment) => comment.type === 'INLINE'),
    [submissionComments],
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
    () => submissionComments.filter((comment) => comment.type === 'GENERAL'),
    [submissionComments],
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

  const inlineLineSummaries = useMemo(() => {
    const groupedByLine = new Map<number, { lineNumber: number; commentCount: number }>();

    inlineRootComments.forEach((comment) => {
      const lineNumber = Math.max(1, comment.lineStart || 1);
      const replyCount = (inlineRepliesByParent.get(comment.id) || []).length;
      const previous = groupedByLine.get(lineNumber);

      if (!previous) {
        groupedByLine.set(lineNumber, { lineNumber, commentCount: 1 + replyCount });
        return;
      }

      previous.commentCount += 1 + replyCount;
    });

    return Array.from(groupedByLine.values()).sort((a, b) => a.lineNumber - b.lineNumber);
  }, [inlineRootComments, inlineRepliesByParent]);

  const inlineCommentLineSet = useMemo(
    () => new Set(inlineLineSummaries.map((summary) => summary.lineNumber)),
    [inlineLineSummaries],
  );

  const clearInlineMarkers = useCallback(() => {
    const editor = savedEditorRef.current;
    if (!editor) return;

    inlineMarkerDecorationIdsRef.current = editor.deltaDecorations(
      inlineMarkerDecorationIdsRef.current,
      [],
    );
  }, []);

  const syncInlineGlyphCountStyles = useCallback((summaries: Array<{ commentCount: number }>) => {
    if (typeof document === 'undefined') return;

    const labelsByKey = new Map<string, string>();
    summaries.forEach((summary) => {
      const count = Math.max(1, summary.commentCount || 1);
      const key = count > 99 ? '99p' : String(count);
      const label = count > 99 ? '99+' : String(count);
      labelsByKey.set(key, label);
    });

    if (!inlineGlyphCountStyleRef.current) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-peekle-inline-glyph-count', 'true');
      document.head.appendChild(styleEl);
      inlineGlyphCountStyleRef.current = styleEl;
    }

    const rules = Array.from(labelsByKey.entries())
      .map(([key, label]) => `
.monaco-editor .peekle-comment-glyph--count-${key}::after {
  content: '${label}';
  position: absolute;
  left: 16px;
  top: 1px;
  min-width: 14px;
  height: 12px;
  padding: 0 3px;
  border-radius: 999px;
  background: hsl(var(--primary) / 0.14);
  color: hsl(var(--foreground));
  font-size: 9px;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
  pointer-events: none;
}
`)
      .join('\n');

    inlineGlyphCountStyleRef.current.textContent = rules;
  }, []);

  const logCommentDebug = useCallback((label: string, payload?: unknown) => {
    console.info('[peekle-comments]', label, payload ?? '');
  }, []);

  const handleCreateInlineComment = useCallback(async (
    lineNumber: number,
    content: string,
    parentId?: number | null,
  ) => {
    if (viewMode !== 'SPLIT_SAVED' || !roomId || !targetSubmissionId) return;

    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    setIsPostingInlineComment(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${targetSubmissionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'INLINE',
            parentId: parentId ?? null,
            lineStart: lineNumber,
            lineEnd: lineNumber,
            content: trimmed,
          }),
        },
      );

      if (!response.success) {
        toast.error(response.error?.message || '댓글 저장에 실패했습니다.');
        return;
      }

      setInlineDraftLine(null);
      setInlineDraftParentId(null);
      setInlineEditingCommentId(null);
      setInlineEditingContent('');
      await fetchSubmissionComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } catch {
      toast.error('댓글 저장 중 오류가 발생했습니다.');
    } finally {
      setIsPostingInlineComment(false);
    }
  }, [viewMode, roomId, targetSubmissionId, fetchSubmissionComments]);

  const handleCreateGeneralComment = useCallback(async () => {
    if (viewMode !== 'SPLIT_SAVED' || !roomId || !targetSubmissionId) return;

    const trimmed = generalCommentContent.trim();
    if (!trimmed) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    setIsPostingGeneralComment(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${targetSubmissionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'GENERAL',
            parentId: generalReplyParentId,
            content: trimmed,
          }),
        },
      );

      if (!response.success) {
        toast.error(response.error?.message || '댓글 저장에 실패했습니다.');
        return;
      }

      setGeneralCommentContent('');
      setGeneralReplyParentId(null);
      setGeneralEditingCommentId(null);
      setGeneralEditingContent('');
      await fetchSubmissionComments();
    } catch {
      toast.error('댓글 저장 중 오류가 발생했습니다.');
    } finally {
      setIsPostingGeneralComment(false);
    }
  }, [
    viewMode,
    roomId,
    targetSubmissionId,
    generalCommentContent,
    generalReplyParentId,
    fetchSubmissionComments,
  ]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (viewMode !== 'SPLIT_SAVED' || !roomId || !targetSubmissionId) return;

    setIsPostingInlineComment(true);
    setIsPostingGeneralComment(true);
    try {
      const response = await apiFetch<null>(
        `/api/studies/${roomId}/submissions/${targetSubmissionId}/comments/${commentId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.success) {
        toast.error(response.error?.message || '댓글 삭제에 실패했습니다.');
        return;
      }

      if (inlineEditingCommentId === commentId) {
        setInlineEditingCommentId(null);
        setInlineEditingContent('');
      }
      if (generalEditingCommentId === commentId) {
        setGeneralEditingCommentId(null);
        setGeneralEditingContent('');
      }

      await fetchSubmissionComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
    } catch {
      toast.error('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsPostingInlineComment(false);
      setIsPostingGeneralComment(false);
    }
  }, [
    viewMode,
    roomId,
    targetSubmissionId,
    fetchSubmissionComments,
    inlineEditingCommentId,
    generalEditingCommentId,
  ]);

  const handleUpdateComment = useCallback(async (commentId: number, content: string) => {
    if (viewMode !== 'SPLIT_SAVED' || !roomId || !targetSubmissionId) return false;

    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('댓글 내용을 입력해주세요.');
      return false;
    }

    setIsPostingInlineComment(true);
    setIsPostingGeneralComment(true);
    try {
      const response = await apiFetch<SubmissionCommentItem>(
        `/api/studies/${roomId}/submissions/${targetSubmissionId}/comments/${commentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ content: trimmed }),
        },
      );

      if (!response.success) {
        toast.error(response.error?.message || '댓글 수정에 실패했습니다.');
        return false;
      }

      await fetchSubmissionComments();
      window.dispatchEvent(new CustomEvent('peekle:refresh-submission-comments'));
      return true;
    } catch {
      toast.error('댓글 수정 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsPostingInlineComment(false);
      setIsPostingGeneralComment(false);
    }
  }, [viewMode, roomId, targetSubmissionId, fetchSubmissionComments]);

  const updateHoverAddPosition = useCallback((lineNumber: number | null) => {
    clearHoverHideTimer();
    const editor = savedEditorRef.current;
    if (!editor || !lineNumber || viewMode !== 'SPLIT_SAVED') {
      hideHoverAddButton();
      return;
    }

    const model = editor.getModel();
    if (!model || lineNumber < 1 || lineNumber > model.getLineCount()) {
      hideHoverAddButton();
      return;
    }

    const lineTop = editor.getTopForLineNumber(lineNumber) - editor.getScrollTop();
    const layoutInfo = editor.getLayoutInfo();
    const viewportHeight = layoutInfo.height;
    if (lineTop < -8 || lineTop > viewportHeight - 8) {
      hideHoverAddButton();
      return;
    }

    hoveredLineRef.current = lineNumber;
    setHoveredLineForAdd(lineNumber);
    setHoverAddButtonLeft(Math.max(2, layoutInfo.contentLeft - 10));
    setHoverAddButtonTop(Math.max(4, lineTop + 2));
  }, [clearHoverHideTimer, hideHoverAddButton, viewMode]);

  const renderInlineZones = useCallback(() => {
    const editor = savedEditorRef.current;
    if (!editor || viewMode !== 'SPLIT_SAVED') return;

    editor.changeViewZones((accessor: any) => {
      inlineZoneIdsRef.current.forEach((zoneId) => accessor.removeZone(zoneId));
      if (inlineDraftZoneIdRef.current) {
        accessor.removeZone(inlineDraftZoneIdRef.current);
      }
      inlineZoneIdsRef.current = [];
      inlineDraftZoneIdRef.current = null;

      const showExpandedInlineThreads = false;
      if (showExpandedInlineThreads) {
        inlineRootComments.forEach((comment) => {
        const replies = inlineRepliesByParent.get(comment.id) || [];
        const wrap = document.createElement('div');
        wrap.classList.add('peekle-inline-zone');
        wrap.style.pointerEvents = 'auto';
        wrap.style.position = 'relative';
        wrap.style.zIndex = '40';
        wrap.style.background = 'hsl(var(--card))';
        wrap.style.border = '1px solid hsl(var(--border) / 0.45)';
        wrap.style.borderLeft = '3px solid hsl(var(--primary) / 0.85)';
        wrap.style.borderRadius = '6px';
        wrap.style.margin = '0 12px';
        wrap.style.padding = '8px 10px';
        wrap.style.width = '78%';
        wrap.style.maxWidth = 'calc(100% - 24px)';
        wrap.style.boxSizing = 'border-box';
        wrap.style.fontSize = '12px';
        wrap.style.lineHeight = '1.45';
        wrap.addEventListener('mousedown', (event) => event.stopPropagation());
        wrap.addEventListener('click', (event) => event.stopPropagation());

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.gap = '8px';
        topRow.style.marginBottom = '4px';

        const author = document.createElement('span');
        author.textContent = `${comment.authorNickname} · ${formatCommentDate(comment.createdAt)}`;
        author.style.color = 'hsl(var(--muted-foreground))';

        const actionWrap = document.createElement('div');
        actionWrap.style.display = 'flex';
        actionWrap.style.alignItems = 'center';
        actionWrap.style.gap = '4px';

        const replyBtn = document.createElement('button');
        replyBtn.type = 'button';
        replyBtn.textContent = '답글';
        replyBtn.style.border = 'none';
        replyBtn.style.background = 'transparent';
        replyBtn.style.color = 'hsl(var(--muted-foreground))';
        replyBtn.style.cursor = 'pointer';
        replyBtn.onmousedown = (event) => event.stopPropagation();
        replyBtn.onclick = (event) => {
          event.stopPropagation();
          setInlineDraftLine(comment.lineStart);
          setInlineDraftParentId(comment.id);
          setInlineEditingCommentId(null);
          setInlineEditingContent('');
        };

        const showInlineReply = !comment.isDeleted;
        if (showInlineReply) {
          actionWrap.appendChild(replyBtn);
        }

        const ownActionWrap = document.createElement('div');
        ownActionWrap.style.display = 'flex';
        ownActionWrap.style.alignItems = 'center';
        ownActionWrap.style.gap = '4px';

        if (comment.authorId === currentUserId && !comment.isDeleted) {
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.textContent = '수정';
          editBtn.style.border = 'none';
          editBtn.style.background = 'transparent';
          editBtn.style.color = 'hsl(var(--muted-foreground))';
          editBtn.style.cursor = 'pointer';
          editBtn.onmousedown = (event) => event.stopPropagation();
          editBtn.onclick = (event) => {
            event.stopPropagation();
            setInlineDraftLine(comment.lineStart);
            setInlineDraftParentId(comment.parentId);
            setInlineEditingCommentId(comment.id);
            setInlineEditingContent(comment.content);
            hideHoverAddButton();
          };
          ownActionWrap.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.textContent = '삭제';
          deleteBtn.style.border = 'none';
          deleteBtn.style.background = 'transparent';
          deleteBtn.style.color = 'hsl(var(--muted-foreground))';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.onmousedown = (event) => event.stopPropagation();
          deleteBtn.onclick = (event) => {
            event.stopPropagation();
            void handleDeleteComment(comment.id);
          };
          ownActionWrap.appendChild(deleteBtn);
        }

        actionWrap.appendChild(ownActionWrap);

        topRow.appendChild(author);
        topRow.appendChild(actionWrap);
        wrap.appendChild(topRow);

        const body = document.createElement('p');
        body.style.margin = '0';
        body.style.color = comment.isDeleted
          ? 'hsl(var(--muted-foreground))'
          : 'hsl(var(--foreground))';
        if (comment.isDeleted) {
          body.style.fontStyle = 'italic';
        }
        body.textContent = comment.content;
        wrap.appendChild(body);

        replies.forEach((reply) => {
          const replyBox = document.createElement('div');
          replyBox.style.marginTop = '6px';
          replyBox.style.marginLeft = '10px';
          replyBox.style.borderLeft = '2px solid #cbd5e1';
          replyBox.style.paddingLeft = '8px';

          const replyMeta = document.createElement('div');
          replyMeta.style.display = 'flex';
          replyMeta.style.alignItems = 'center';
          replyMeta.style.justifyContent = 'space-between';
          replyMeta.style.gap = '8px';
          replyMeta.style.color = 'hsl(var(--muted-foreground))';
          replyMeta.style.fontSize = '11px';

          const replyMetaText = document.createElement('span');
          replyMetaText.textContent = `${reply.authorNickname} · ${formatCommentDate(reply.createdAt)}`;
          replyMeta.appendChild(replyMetaText);

          const replyOwnActions = document.createElement('div');
          replyOwnActions.style.display = 'flex';
          replyOwnActions.style.alignItems = 'center';
          replyOwnActions.style.gap = '4px';

          if (reply.authorId === currentUserId && !reply.isDeleted) {
            const replyEditBtn = document.createElement('button');
            replyEditBtn.type = 'button';
            replyEditBtn.textContent = '수정';
            replyEditBtn.style.border = 'none';
            replyEditBtn.style.background = 'transparent';
            replyEditBtn.style.color = 'hsl(var(--muted-foreground))';
            replyEditBtn.style.cursor = 'pointer';
            replyEditBtn.onmousedown = (event) => event.stopPropagation();
            replyEditBtn.onclick = (event) => {
              event.stopPropagation();
              setInlineDraftLine(reply.lineStart);
              setInlineDraftParentId(reply.parentId);
              setInlineEditingCommentId(reply.id);
              setInlineEditingContent(reply.content);
              hideHoverAddButton();
            };
            replyOwnActions.appendChild(replyEditBtn);

            const replyDeleteBtn = document.createElement('button');
            replyDeleteBtn.type = 'button';
            replyDeleteBtn.textContent = '삭제';
            replyDeleteBtn.style.border = 'none';
            replyDeleteBtn.style.background = 'transparent';
            replyDeleteBtn.style.color = 'hsl(var(--muted-foreground))';
            replyDeleteBtn.style.cursor = 'pointer';
            replyDeleteBtn.onmousedown = (event) => event.stopPropagation();
            replyDeleteBtn.onclick = (event) => {
              event.stopPropagation();
              void handleDeleteComment(reply.id);
            };
            replyOwnActions.appendChild(replyDeleteBtn);
          }

          replyMeta.appendChild(replyOwnActions);

          const replyBody = document.createElement('div');
          replyBody.style.color = 'hsl(var(--foreground))';
          replyBody.textContent = reply.content;

          if (reply.isDeleted) {
            replyBody.style.color = 'hsl(var(--muted-foreground))';
            replyBody.style.fontStyle = 'italic';
          }

          replyBox.appendChild(replyMeta);
          replyBox.appendChild(replyBody);
          wrap.appendChild(replyBox);
        });

        const zoneId = accessor.addZone({
          afterLineNumber: Math.max(1, comment.lineEnd || comment.lineStart || 1),
          heightInPx: Math.max(104, 104 + replies.length * 42),
          domNode: wrap,
        });
          inlineZoneIdsRef.current.push(zoneId);
        });
      }

      if (inlineDraftLine) {
        const draftWrap = document.createElement('div');
        draftWrap.classList.add('peekle-inline-zone', 'peekle-inline-zone-draft');
        draftWrap.style.pointerEvents = 'auto';
        draftWrap.style.position = 'relative';
        draftWrap.style.zIndex = '50';
        draftWrap.style.margin = '0 12px';
        draftWrap.style.padding = '10px';
        draftWrap.style.border = '1px solid hsl(var(--border) / 0.55)';
        draftWrap.style.borderTop = '2px solid hsl(var(--primary))';
        draftWrap.style.borderRadius = '8px';
        draftWrap.style.background = 'hsl(var(--card))';
        draftWrap.style.boxShadow = '0 10px 22px -18px rgba(15, 23, 42, 0.45)';
        draftWrap.style.width = '78%';
        draftWrap.style.maxWidth = 'calc(100% - 24px)';
        draftWrap.style.boxSizing = 'border-box';

        const title = document.createElement('div');
        title.textContent = inlineEditingCommentId
          ? `L${inlineDraftLine} 댓글 수정`
          : inlineDraftParentId
            ? `L${inlineDraftLine} 답글 작성`
            : `L${inlineDraftLine} 인라인 댓글 작성`;
        title.style.fontSize = '11px';
        title.style.fontWeight = '600';
        title.style.color = 'hsl(var(--primary))';
        title.style.marginBottom = '6px';

        const textarea = document.createElement('textarea');
        textarea.style.pointerEvents = 'auto';
        textarea.placeholder = '라인 댓글을 입력하세요';
        textarea.style.width = '100%';
        textarea.style.height = '54px';
        textarea.style.resize = 'none';
        textarea.style.border = '1px solid hsl(var(--border) / 0.65)';
        textarea.style.borderRadius = '6px';
        textarea.style.padding = '6px';
        textarea.style.fontSize = '12px';
        textarea.style.background = 'hsl(var(--background))';
        textarea.style.color = 'hsl(var(--foreground))';
        textarea.value = inlineEditingCommentId ? inlineEditingContent : '';

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.justifyContent = 'flex-end';
        buttonRow.style.gap = '6px';
        buttonRow.style.marginTop = '6px';

        const cancelBtn = document.createElement('button');
        cancelBtn.style.pointerEvents = 'auto';
        cancelBtn.type = 'button';
        cancelBtn.textContent = '취소';
        cancelBtn.style.border = '1px solid hsl(var(--border) / 0.65)';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.background = 'hsl(var(--background))';
        cancelBtn.style.color = 'hsl(var(--foreground))';
        cancelBtn.style.fontSize = '11px';
        cancelBtn.style.padding = '2px 8px';
        cancelBtn.onclick = () => {
          setInlineDraftLine(null);
          setInlineDraftParentId(null);
          setInlineEditingCommentId(null);
          setInlineEditingContent('');
        };

        const submitBtn = document.createElement('button');
        submitBtn.style.pointerEvents = 'auto';
        submitBtn.type = 'button';
        submitBtn.textContent = isPostingInlineComment
          ? '저장중...'
          : inlineEditingCommentId
            ? '수정'
            : '등록';
        submitBtn.style.border = '1px solid hsl(var(--primary))';
        submitBtn.style.borderRadius = '6px';
        submitBtn.style.background = 'hsl(var(--primary))';
        submitBtn.style.color = 'hsl(var(--primary-foreground))';
        submitBtn.style.fontSize = '11px';
        submitBtn.style.padding = '2px 8px';
        submitBtn.disabled = isPostingInlineComment;
        submitBtn.onclick = () => {
          if (inlineEditingCommentId) {
            void handleUpdateComment(inlineEditingCommentId, textarea.value).then((updated) => {
              if (updated) {
                setInlineDraftLine(null);
                setInlineDraftParentId(null);
                setInlineEditingCommentId(null);
                setInlineEditingContent('');
              }
            });
            return;
          }

          void handleCreateInlineComment(inlineDraftLine, textarea.value, inlineDraftParentId);
        };

        buttonRow.appendChild(cancelBtn);
        buttonRow.appendChild(submitBtn);

        draftWrap.appendChild(title);
        draftWrap.appendChild(textarea);
        draftWrap.appendChild(buttonRow);

        draftWrap.addEventListener('mousedown', (event) => event.stopPropagation());
        draftWrap.addEventListener('click', (event) => event.stopPropagation());

        inlineDraftZoneIdRef.current = accessor.addZone({
          afterLineNumber: inlineDraftLine,
          heightInPx: 148,
          domNode: draftWrap,
        });
      }
    });
  }, [
    viewMode,
    inlineRootComments,
    inlineRepliesByParent,
    inlineDraftLine,
    inlineDraftParentId,
    isPostingInlineComment,
    formatCommentDate,
    focusSavedLine,
    currentUserId,
    handleDeleteComment,
    handleCreateInlineComment,
    handleUpdateComment,
    inlineEditingCommentId,
    inlineEditingContent,
    hideHoverAddButton,
  ]);

  const renderInlineMarkers = useCallback(() => {
    const editor = savedEditorRef.current;
    if (!editor) return;

    if (viewMode !== 'SPLIT_SAVED') {
      clearInlineMarkers();
      syncInlineGlyphCountStyles([]);
      return;
    }

    const decorations = inlineLineSummaries.map((summary) => ({
      range: {
        startLineNumber: summary.lineNumber,
        startColumn: 1,
        endLineNumber: summary.lineNumber,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        glyphMarginClassName: `peekle-comment-glyph peekle-comment-glyph--count-${
          summary.commentCount > 99 ? '99p' : Math.max(1, summary.commentCount || 1)
        }`,
        glyphMarginHoverMessage: {
          value: `L${summary.lineNumber} 댓글 ${summary.commentCount}개`,
        },
      },
    }));

    syncInlineGlyphCountStyles(inlineLineSummaries);
    inlineMarkerDecorationIdsRef.current = editor.deltaDecorations(
      inlineMarkerDecorationIdsRef.current,
      decorations,
    );
    logCommentDebug('render-markers', {
      markerCount: decorations.length,
      lines: inlineLineSummaries.map((item) => item.lineNumber),
    });
  }, [
    viewMode,
    inlineLineSummaries,
    clearInlineMarkers,
    logCommentDebug,
    syncInlineGlyphCountStyles,
  ]);

  const getLineNumberFromMouseTarget = useCallback((target: any): number | null => {
    const fromPosition = target?.position?.lineNumber;
    if (Number.isFinite(fromPosition) && fromPosition > 0) return fromPosition;

    const fromRange = target?.range?.startLineNumber;
    if (Number.isFinite(fromRange) && fromRange > 0) return fromRange;

    const fromDetail = target?.detail?.position?.lineNumber;
    if (Number.isFinite(fromDetail) && fromDetail > 0) return fromDetail;

    const fromDetailLine = target?.detail?.lineNumber;
    if (Number.isFinite(fromDetailLine) && fromDetailLine > 0) return fromDetailLine;

    return null;
  }, []);

  const openCommentsPanelAtLine = useCallback((lineNumber: number | null | undefined) => {
    if (viewMode !== 'SPLIT_SAVED') return;

    logCommentDebug('open-comments-panel', { lineNumber });
    setRightPanelActiveTab('comments');
    setIsRightPanelFolded(false);
    window.dispatchEvent(
      new CustomEvent('peekle:open-comments-panel', {
        detail: { lineNumber },
      }),
    );
    if (!lineNumber) return;

    window.dispatchEvent(
      new CustomEvent('peekle:select-comment-line', {
        detail: { lineNumber },
      }),
    );
    focusSavedLine(lineNumber);
  }, [focusSavedLine, setIsRightPanelFolded, setRightPanelActiveTab, viewMode, logCommentDebug]);

  const handleSavedEditorMount = useCallback((editor: any) => {
    savedEditorRef.current = editor;
    const container = editor.getContainerDomNode?.();
    if (container instanceof HTMLElement) {
      savedEditorContainerRef.current = container;
      container.classList.add('peekle-inline-interactive');
    }

    editor.onMouseMove((event: any) => {
      if (viewMode !== 'SPLIT_SAVED') return;
      clearHoverHideTimer();

      // Monaco MouseTargetType.CONTENT_VIEW_ZONE = 8
      // Ignore hover trigger on inline comment boxes/view-zones.
      const targetType = event?.target?.type;
      const targetElement = event?.target?.element as HTMLElement | undefined;
      const isViewZoneTarget = targetType === 8 || Boolean(targetElement?.closest?.('.view-zones'));
      if (isViewZoneTarget) {
        hideHoverAddButton();
        return;
      }

      const lineNumber = getLineNumberFromMouseTarget(event?.target);
      if (!lineNumber) {
        hideHoverAddButton();
        return;
      }

      updateHoverAddPosition(lineNumber);
    });

    editor.onMouseDown((event: any) => {
      if (viewMode !== 'SPLIT_SAVED') return;
      const targetElement = event?.target?.element as HTMLElement | undefined;
      const targetType = event?.target?.type;
      const isGutterTarget = targetType === 2 || targetType === 3 || targetType === 4;
      const isGlyphTarget =
        Boolean(targetElement?.classList?.contains('peekle-comment-glyph')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-glyph'));
      const isInlineMarkerTarget =
        Boolean(targetElement?.classList?.contains('peekle-comment-inline-badge')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-inline-badge')) ||
        Boolean(targetElement?.classList?.contains('peekle-comment-inline-dot')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-inline-dot')) ||
        isGlyphTarget;
      let lineNumber = getLineNumberFromMouseTarget(event?.target);
      if (
        !lineNumber &&
        (isInlineMarkerTarget || isGutterTarget)
      ) {
        lineNumber = hoveredLineRef.current;
      }
      if (!lineNumber) {
        lineNumber = savedEditorRef.current?.getPosition?.()?.lineNumber ?? null;
      }
      if (!lineNumber && hoveredLineRef.current) {
        lineNumber = hoveredLineRef.current;
      }

      logCommentDebug('mouse-down', {
        targetType,
        className: targetElement?.className,
        isGutterTarget,
        isGlyphTarget,
        lineNumber,
      });

      if (isGutterTarget) {
        openCommentsPanelAtLine(lineNumber ?? null);
        return;
      }
      const isCommentLine = Boolean(lineNumber && inlineCommentLineSet.has(lineNumber));
      if (!isCommentLine) return;
      if (!lineNumber) return;
      if (targetType === 8) return;
      openCommentsPanelAtLine(lineNumber);
    });

    editor.onMouseUp((event: any) => {
      if (viewMode !== 'SPLIT_SAVED') return;

      const targetElement = event?.target?.element as HTMLElement | undefined;
      const targetType = event?.target?.type;
      const isGutterTarget = targetType === 2 || targetType === 3 || targetType === 4;
      const isGlyphTarget =
        Boolean(targetElement?.classList?.contains('peekle-comment-glyph')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-glyph'));
      const isInlineMarkerTarget =
        Boolean(targetElement?.classList?.contains('peekle-comment-inline-badge')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-inline-badge')) ||
        Boolean(targetElement?.classList?.contains('peekle-comment-inline-dot')) ||
        Boolean(targetElement?.closest?.('.peekle-comment-inline-dot')) ||
        isGlyphTarget;
      if (!isInlineMarkerTarget) return;

      const lineNumber =
        getLineNumberFromMouseTarget(event?.target) ??
        savedEditorRef.current?.getPosition?.()?.lineNumber ??
        hoveredLineRef.current;

      logCommentDebug('mouse-up', {
        targetType,
        className: targetElement?.className,
        isGutterTarget,
        isGlyphTarget,
        lineNumber,
      });
      if (isGutterTarget) {
        openCommentsPanelAtLine(lineNumber ?? null);
        return;
      }
      if (!lineNumber || !inlineCommentLineSet.has(lineNumber)) return;
      openCommentsPanelAtLine(lineNumber);
    });

    editor.onMouseLeave(() => {
      clearHoverHideTimer();
      hoverHideTimerRef.current = setTimeout(() => {
        if (isHoveringAddButtonRef.current) return;
        hideHoverAddButton();
      }, 80);
    });

    editor.onDidScrollChange(() => {
      updateHoverAddPosition(hoveredLineRef.current);
    });

    editor.onDidLayoutChange(() => {
      updateHoverAddPosition(hoveredLineRef.current);
    });

    renderInlineZones();
    renderInlineMarkers();
  }, [
    clearHoverHideTimer,
    hideHoverAddButton,
    renderInlineZones,
    renderInlineMarkers,
    updateHoverAddPosition,
    viewMode,
    focusSavedLine,
    getLineNumberFromMouseTarget,
    inlineCommentLineSet,
    inlineLineSummaries,
    openCommentsPanelAtLine,
    logCommentDebug,
  ]);

  useEffect(() => {
    const container = savedEditorContainerRef.current;
    const editor = savedEditorRef.current;
    if (!container || !editor) return;

    if (marginPointerListenerRef.current) {
      container.removeEventListener('pointerdown', marginPointerListenerRef.current, true);
      marginPointerListenerRef.current = null;
    }

    const nativeMarginPointerDown = (nativeEvent: PointerEvent) => {
      if (viewMode !== 'SPLIT_SAVED') return;
      const target = nativeEvent.target as HTMLElement | null;
      if (!target) return;

      const isMarginClick = Boolean(
        target.closest('.margin') ||
        target.closest('.margin-view-overlays') ||
        target.closest('.line-numbers') ||
        target.closest('.peekle-comment-glyph') ||
        target.classList.contains('cgmr'),
      );
      if (!isMarginClick) return;

      const mouseTarget = editor.getTargetAtClientPoint?.(nativeEvent.clientX, nativeEvent.clientY);
      const lineNumber =
        getLineNumberFromMouseTarget(mouseTarget) ??
        editor.getPosition?.()?.lineNumber ??
        hoveredLineRef.current ??
        null;

      logCommentDebug('native-margin-pointerdown', {
        className: target.className,
        lineNumber,
        hasInlineComments: inlineLineSummaries.length > 0,
      });

      openCommentsPanelAtLine(lineNumber);
    };

    marginPointerListenerRef.current = nativeMarginPointerDown;
    container.addEventListener('pointerdown', nativeMarginPointerDown, true);

    return () => {
      container.removeEventListener('pointerdown', nativeMarginPointerDown, true);
      if (marginPointerListenerRef.current === nativeMarginPointerDown) {
        marginPointerListenerRef.current = null;
      }
    };
  }, [viewMode, getLineNumberFromMouseTarget, inlineLineSummaries.length, logCommentDebug, openCommentsPanelAtLine]);

  const startResizingVideo = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingVideo(true);
      resizeStartY.current = e.clientY;
      resizeStartHeight.current = videoGridHeight;
    },
    [videoGridHeight],
  );

  useEffect(() => {
    if (!isResizingVideo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY.current;
      setVideoGridHeight(Math.max(100, Math.min(600, resizeStartHeight.current + deltaY)));
    };

    const handleMouseUp = () => {
      setIsResizingVideo(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingVideo]);

  const startResizingConsole = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingConsole(true);
      consoleResizeStartY.current = e.clientY;
      consoleResizeStartHeight.current = consoleHeight;
    },
    [consoleHeight],
  );

  useEffect(() => {
    if (!isResizingConsole) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = consoleResizeStartY.current - e.clientY;
      setConsoleHeight(Math.max(100, Math.min(600, consoleResizeStartHeight.current + deltaY)));
    };

    const handleMouseUp = () => {
      setIsResizingConsole(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingConsole]);


  // [Fix] Whiteboard is only visible when a problem is selected
  const isWhiteboardVisible = isWhiteboardOverlayOpen && !!selectedProblemTitle;

  // Show right panel when viewing other's code OR whiteboard is open
  const showRightPanel = isViewingOther || isWhiteboardVisible;
  const showVideoSection = !isMobile || mobileTab === 'video';
  const showProblemSection = !isMobile || mobileTab === 'code';
  const isVideoGridCollapsed = !isMobile && isVideoGridFolded;
  const showMyIdePanel = !isMobile || !showRightPanel;
  const showViewerPanel = showRightPanel;
  const myProblemLabel = selectedProblemTitle
    ? `${selectedProblemExternalId ? `[${selectedProblemExternalId}] ` : ''}${selectedProblemTitle}`
    : '문제 선택 중';
  const savedCodeOwner = (targetSubmission?.username || '').trim();
  const savedCodeLanguageLabel = targetSubmission?.language
    ? getLanguageBadgeLabel(targetSubmission.language)
    : '';
  const savedCodeMetaLabel = [savedCodeOwner, savedCodeLanguageLabel]
    .filter((value) => value.length > 0)
    .join(' · ');
  const savedCodePanelLabel = savedCodeMetaLabel
    ? `저장 코드 (${savedCodeMetaLabel})`
    : '저장 코드 문제';
  const otherProblemLabel =
    viewMode === 'SPLIT_SAVED'
      ? targetSubmission?.problemTitle || '저장된 코드'
      : (() => {
        const title = (realtimeProblemTitle || '').trim();
        if (!title) return '문제 선택 중';
        const externalPrefix = realtimeProblemExternalId
          ? `[${realtimeProblemExternalId}] `
          : '';
        const languageSuffix = realtimeLanguage
          ? ` (${getLanguageBadgeLabel(realtimeLanguage)})`
          : '';
        return `${externalPrefix}${title}${languageSuffix}`;
      })();
  const normalizedProblemExternalId = String(selectedProblemExternalId ?? '').replace(/[^0-9]/g, '');
  const canSplitOpenProblem =
    !isMobile &&
    !isViewingOther &&
    normalizedProblemExternalId.length > 0 &&
    Number(normalizedProblemExternalId) > 0;

  const handleOpenProblemSplit = useCallback(() => {
    const externalId = Number(normalizedProblemExternalId);
    if (!Number.isFinite(externalId) || externalId <= 0) {
      toast.error('분할로 열 수 있는 문제 링크가 없습니다.');
      return;
    }

    const screenAvailWidth = window.screen.availWidth;
    const screenAvailHeight = window.screen.availHeight;
    const halfWidth = Math.floor(screenAvailWidth / 2);
    const screenLeft = (window.screen as any).availLeft || 0;
    const screenTop = (window.screen as any).availTop || 0;

    setIsLeftPanelFolded(true);
    setIsRightPanelFolded(true);

    const studyProblemIdValue = Number(selectedStudyProblemId);
    const studyIdValue = Number(roomId);

    window.postMessage(
      {
        type: 'PEEKLE_WINDOW_SPLIT',
        payload: {
          url: `https://www.acmicpc.net/problem/${externalId}`,
          leftWindow: { left: screenLeft, top: screenTop, width: halfWidth, height: screenAvailHeight },
          rightWindow: {
            left: screenLeft + halfWidth,
            top: screenTop,
            width: halfWidth,
            height: screenAvailHeight,
          },
          context: {
            sourceType: 'STUDY',
            externalId,
            studyProblemId:
              Number.isFinite(studyProblemIdValue) && studyProblemIdValue > 0
                ? studyProblemIdValue
                : undefined,
            studyId: Number.isFinite(studyIdValue) && studyIdValue > 0 ? studyIdValue : undefined,
          },
        },
      },
      '*',
    );
  }, [
    normalizedProblemExternalId,
    selectedStudyProblemId,
    roomId,
    setIsLeftPanelFolded,
    setIsRightPanelFolded,
  ]);

  // Track my latest code to respond to pull requests
  const myLatestCodeRef = useRef<string>('');
  const [restoredCode, setRestoredCode] = useState<string | null>(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [isHydratingDraft, setIsHydratingDraft] = useState(false);
  const restorePublishPayloadRef = useRef<{
    problemId: number;
    code: string;
    language: string;
  } | null>(null);
  const hydratedProblemKeyRef = useRef<string | null>(null);
  const restoreRequestSeqRef = useRef(0);
  const lastRestoredLanguageRef = useRef<string>('python');
  const previousSelectionRef = useRef<{ studyProblemId: number | null; language: string }>({
    studyProblemId: null,
    language: 'python',
  });
  const ideEventTsRef = useRef(0);

  const nextIdeEventTs = () => {
    const now = Date.now();
    if (now <= ideEventTsRef.current) {
      ideEventTsRef.current += 1;
    } else {
      ideEventTsRef.current = now;
    }
    return ideEventTsRef.current;
  };

  const publishIdeUpdate = (
    codeValue: string,
    languageValue: string,
    problemIdValue?: number | null,
    eventTsValue?: number,
  ) => {
    const targetProblemId = problemIdValue ?? selectedStudyProblemId;
    if (!socket || !roomId || !targetProblemId) return;
    const eventTs = eventTsValue ?? nextIdeEventTs();

    socket.publish({
      destination: '/pub/ide/update',
      body: JSON.stringify({
        problemId: targetProblemId,
        problemTitle: selectedProblemTitle,
        externalId: selectedProblemExternalId,
        code: codeValue,
        lang: languageValue,
        language: languageValue,
        eventTs,
      }),
    });
  };

  // [Problem Selection] Save current code before switching, then request new problem's code
  const handleCodeChange = (code: string, languageOverride?: string): void => {
    myLatestCodeRef.current = code;
    const targetLanguage = languageOverride || language;

    publishIdeUpdate(code, targetLanguage);
  };

  // Provide IDE code to external components (like Testcase Runner Modal) via custom events
  useEffect(() => {
    const handleRequestCode = () => {
      let currentCode = leftPanelRef.current?.getValue();
      if (!currentCode) currentCode = myLatestCodeRef.current;

      window.dispatchEvent(new CustomEvent('receive-ide-code', {
        detail: {
          code: currentCode || '',
          language: language
        }
      }));
    };

    window.addEventListener('request-ide-code', handleRequestCode);
    return () => window.removeEventListener('request-ide-code', handleRequestCode);
  }, [language, leftPanelRef]);

  const handleLanguageChange = (lang: string, switchedCode?: string): void => {
    setLanguage(lang);
    const templateCode = switchedCode ?? getTemplateCode(lang);
    myLatestCodeRef.current = templateCode;
    if (socket && roomId && selectedStudyProblemId) {
      const eventTs = nextIdeEventTs();
      socket.publish({
        destination: '/pub/ide/language',
        body: JSON.stringify({
          problemId: selectedStudyProblemId,
          problemTitle: selectedProblemTitle,
          externalId: selectedProblemExternalId,
          code: templateCode,
          lang,
          language: lang,
          eventTs,
        }),
      });
    }
  };

  const handleExecuteWrapper = useCallback((input: string) => {
    // 1. Try to get actively from Editor Ref (safest and most current)
    // 2. Fallback to myLatestCodeRef
    let currentCode = leftPanelRef.current?.getValue();
    if (!currentCode) currentCode = myLatestCodeRef.current;

    if (!currentCode || !currentCode.trim()) {
      toast.error('실행할 코드가 없습니다. 코드를 먼저 작성해주세요.');
      return;
    }
    executeCode({
      language,
      code: currentCode,
      input
    });
    setIsConsoleOpen(true);
  }, [language, executeCode, leftPanelRef]);

  const handleWhiteboardToggleWrapper = () => {
    if (!selectedProblemTitle) {
      toast.error('문제를 먼저 선택해주세요.');
      return;
    }
    onWhiteboardToggle?.();
  };

  useEffect(() => {
    if (!roomId) {
      previousSelectionRef.current = { studyProblemId: selectedStudyProblemId, language };
      return;
    }

    const previousProblemId = previousSelectionRef.current.studyProblemId;
    const previousLanguage = previousSelectionRef.current.language;

    if (previousProblemId && previousProblemId !== selectedStudyProblemId) {
      const latestCode = leftPanelRef.current?.getValue() || myLatestCodeRef.current || '';
      void apiFetch(`/api/studies/${roomId}/problems/${previousProblemId}/draft`, {
        method: 'POST',
        body: JSON.stringify({
          code: latestCode,
          language: previousLanguage,
        }),
      });
    }

    previousSelectionRef.current = { studyProblemId: selectedStudyProblemId, language };
  }, [roomId, selectedStudyProblemId, language, leftPanelRef]);

  useEffect(() => {
    if (!roomId || !selectedStudyProblemId) {
      hydratedProblemKeyRef.current = null;
      setIsHydratingDraft(false);
      return;
    }

    const problemKey = `${roomId}:${selectedStudyProblemId}`;
    hydratedProblemKeyRef.current = problemKey;
    const requestSeq = ++restoreRequestSeqRef.current;
    setIsHydratingDraft(true);

    const isLatestRequest = () => restoreRequestSeqRef.current === requestSeq;

    const applyCode = (nextCode: string, storageLanguage: string) => {
      if (!isLatestRequest()) return;

      const normalizedStorageLanguage = normalizeLanguage(storageLanguage);
      myLatestCodeRef.current = nextCode;
      lastRestoredLanguageRef.current = normalizedStorageLanguage;
      restorePublishPayloadRef.current = {
        problemId: selectedStudyProblemId,
        code: nextCode,
        language: normalizedStorageLanguage,
      };
      setRestoredCode(nextCode);
      setRestoreVersion((prev) => prev + 1);

      if (normalizeLanguage(language) !== normalizedStorageLanguage) {
        // Keep editor language and restored draft language in sync without
        // showing an intermediate template state.
        setLanguage(normalizedStorageLanguage);
      }
    };

    const seedTemplateCode = () => {
      const defaultLanguage = 'python';
      const templateCode = getTemplateCode(defaultLanguage);
      applyCode(templateCode, defaultLanguage);
    };

    const finishHydration = () => {
      if (!isLatestRequest()) return;
      window.requestAnimationFrame(() => {
        if (!isLatestRequest()) return;
        setIsHydratingDraft(false);
      });
    };

    const hydrateDraft = async () => {
      try {
        const response = await apiFetch<{ code?: string; language?: string }>(
          `/api/studies/${roomId}/problems/${selectedStudyProblemId}/draft`,
        );

        if (!isLatestRequest()) return;

        const draftCode = response.data?.code;
        const draftLanguage = response.data?.language
          ? normalizeLanguage(response.data.language)
          : 'python';

        if (response.success && typeof draftCode === 'string') {
          applyCode(draftCode, draftLanguage);
          finishHydration();
          return;
        }
      } catch {
        // Ignore draft fetch failures and fall back to template code
      }

      seedTemplateCode();
      finishHydration();
    };

    void hydrateDraft();
  }, [roomId, selectedStudyProblemId, setLanguage]);

  useEffect(() => {
    if (!socket || !roomId || !selectedStudyProblemId) return;
    if (restoreVersion <= 0) return;

    const payload = restorePublishPayloadRef.current;
    if (!payload) return;
    if (payload.problemId !== selectedStudyProblemId) return;

    publishIdeUpdate(payload.code, payload.language, selectedStudyProblemId);
  }, [socket, roomId, selectedStudyProblemId, restoreVersion]);

  useEffect(() => {
    void fetchSubmissionComments();
  }, [fetchSubmissionComments]);

  useEffect(() => {
    const handleRefreshComments = () => {
      void fetchSubmissionComments();
    };

    const handleFocusSavedLine = (
      event: Event,
    ) => {
      const customEvent = event as CustomEvent<{
        lineNumber?: number;
        openDraft?: boolean;
        parentId?: number | null;
      }>;
      const lineNumber = customEvent.detail?.lineNumber;
      if (!lineNumber || viewMode !== 'SPLIT_SAVED') return;

      focusSavedLine(lineNumber);

      if (customEvent.detail?.openDraft) {
        setInlineDraftLine(lineNumber);
        setInlineDraftParentId(customEvent.detail?.parentId ?? null);
        setInlineEditingCommentId(null);
        setInlineEditingContent('');
      }
    };

    window.addEventListener('peekle:refresh-submission-comments', handleRefreshComments);
    window.addEventListener('peekle:focus-saved-comment-line', handleFocusSavedLine as EventListener);

    return () => {
      window.removeEventListener('peekle:refresh-submission-comments', handleRefreshComments);
      window.removeEventListener(
        'peekle:focus-saved-comment-line',
        handleFocusSavedLine as EventListener,
      );
    };
  }, [fetchSubmissionComments, focusSavedLine, viewMode]);

  useEffect(() => {
    if (viewMode !== 'SPLIT_SAVED') {
      clearInlineZones();
      clearInlineMarkers();
      clearHoverHideTimer();
      isHoveringAddButtonRef.current = false;
      setGeneralCommentContent('');
      setGeneralReplyParentId(null);
      setGeneralEditingCommentId(null);
      setGeneralEditingContent('');
      setInlineDraftLine(null);
      setInlineDraftParentId(null);
      setInlineEditingCommentId(null);
      setInlineEditingContent('');
      hideHoverAddButton();
      return;
    }
    renderInlineZones();
    renderInlineMarkers();
  }, [
    viewMode,
    clearHoverHideTimer,
    clearInlineZones,
    clearInlineMarkers,
    hideHoverAddButton,
    renderInlineZones,
    renderInlineMarkers,
  ]);

  useEffect(() => {
    clearHoverHideTimer();
    isHoveringAddButtonRef.current = false;
    setGeneralCommentContent('');
    setGeneralReplyParentId(null);
    setGeneralEditingCommentId(null);
    setGeneralEditingContent('');
    setInlineDraftLine(null);
    setInlineDraftParentId(null);
    setInlineEditingCommentId(null);
    setInlineEditingContent('');
    hideHoverAddButton();
  }, [targetSubmissionId, clearHoverHideTimer, hideHoverAddButton]);

  useEffect(() => {
    renderInlineZones();
    renderInlineMarkers();
  }, [renderInlineZones, renderInlineMarkers]);

  useEffect(() => () => {
    clearHoverHideTimer();
    isHoveringAddButtonRef.current = false;
    if (savedEditorContainerRef.current && marginPointerListenerRef.current) {
      savedEditorContainerRef.current.removeEventListener(
        'pointerdown',
        marginPointerListenerRef.current,
        true,
      );
    }
    marginPointerListenerRef.current = null;
    savedEditorContainerRef.current = null;
    if (inlineGlyphCountStyleRef.current) {
      inlineGlyphCountStyleRef.current.remove();
      inlineGlyphCountStyleRef.current = null;
    }
    clearInlineZones();
    clearInlineMarkers();
  }, [clearHoverHideTimer, clearInlineZones, clearInlineMarkers]);

  return (
    <div className={cn('flex h-full flex-col min-w-0 min-h-0', className)}>

      {showVideoSection && (
        <>
          {/* Video Grid Header */}
          <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0">
            <span className="text-sm font-medium">화상 타일</span>
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleVideoGrid}
                title={isVideoGridFolded ? '화상 타일 펼치기' : '화상 타일 접기'}
              >
                {isVideoGridFolded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Video Grid */}
          {!isVideoGridCollapsed && (
            <>
              <div
                style={
                  isMobile && mobileTab === 'video' ? undefined : { height: videoGridHeight }
                }
                className={cn(
                  'relative transition-none',
                  isMobile && mobileTab === 'video' ? 'flex-1 min-h-0' : 'shrink-0',
                )}
              >
                <VideoGrid onWhiteboardClick={onWhiteboardClick} className="h-full" />
              </div>
              {/* Resize Handle */}
              {!isMobile && (
                <div
                  className="h-1 cursor-row-resize bg-border/50 hover:bg-primary/50 active:bg-primary transition-colors shrink-0 z-10"
                  onMouseDown={startResizingVideo}
                />
              )}
            </>
          )}
        </>
      )}

      {/* IDE Area */}
      {showProblemSection && (
        <div
          className="relative flex min-h-0 flex-1 flex-col min-w-0 bg-background"
          data-tour="ide-panel"
        >
        {/* Header Row: Always show toolbar for Left IDE.  
            If isViewingOther, the toolbar layout adapts to show View Mode Banner on left and Tools on right. */}
        <div className="flex h-14 shrink-0 border-b border-border bg-card">
          <div className="w-full">
            <IDEToolbar
              language={language}
              theme={theme}
              fontSize={fontSize}
              // Conditional Props based on View Mode
              viewingUser={isViewingOther ? viewingUser : null}
              viewMode={viewMode}
              targetSubmission={targetSubmission}
              onResetView={resetToOnlyMine}
              disabled={!selectedProblemTitle && !isViewingOther}
              problemExternalId={selectedProblemExternalId}
              currentProblemLabel={selectedProblemTitle}
              // Standard Handlers
              onLanguageChange={(lang) => leftPanelRef.current?.setLanguage(lang)}
              onThemeToggle={handleThemeToggle}
              onFontSizeChange={handleFontSizeChange}
              onCopy={() => {
                void handleCopy();
              }}
              onRefChat={() => {
                const currentSelectedProblemTitle = useRoomStore.getState().selectedProblemTitle;

                if (isViewingOther) {
                  // Smart Ref Chat: Capture other's code
                  const code =
                    viewMode === 'SPLIT_SAVED'
                      ? (targetSubmission?.code ?? '')
                      : (realtimeCode ?? '');
                  const lang =
                    viewMode === 'SPLIT_SAVED'
                      ? (targetSubmission?.language ?? 'python')
                      : (realtimeLanguage ?? 'python');

                  // For bots, we want to include (Bot) and for saved submissions, indicate it's stored code
                  let ownerName =
                    viewMode === 'SPLIT_SAVED' ? targetSubmission?.username : viewingUser?.nickname;

                  let resolvedProblemTitle = currentSelectedProblemTitle || 'Unknown Problem';
                  let resolvedProblemId = useRoomStore.getState().selectedStudyProblemId ?? undefined;

                  if (viewMode === 'SPLIT_SAVED' && targetSubmission) {
                    const isBot =
                      targetSubmission.username === 'PS러버' ||
                      targetSubmission.username === 'CodeNinja';
                    ownerName = `${targetSubmission.username}${isBot ? ' (Bot)' : ''}의 저장된 코드`;

                    if (targetSubmission.problemTitle) {
                      resolvedProblemTitle = targetSubmission.problemTitle;
                    }
                    if (targetSubmission.problemId) {
                      resolvedProblemId = targetSubmission.problemId;
                    }
                  }

                  useRoomStore.getState().setPendingCodeShare({
                    code,
                    language: lang || 'python', // Fallback or infer
                    ownerName: ownerName || 'Unknown',
                    problemTitle: resolvedProblemTitle,
                    problemId: resolvedProblemId,
                    problemExternalId: selectedProblemId ? String(selectedProblemId) : undefined, // Using actual problemId as externalId fallback
                    externalId: selectedProblemExternalId || undefined,
                    isRealtime: viewMode === 'SPLIT_REALTIME',
                  });
                  useRoomStore.getState().setRightPanelActiveTab('chat');
                  setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) chatInput.focus();
                  }, 0);
                } else {
                  // Capture My Code
                  void handleRefChat();

                  // Enhancing pending share with problem title
                  setTimeout(() => {
                    const currentPending = useRoomStore.getState().pendingCodeShare;
                    if (currentPending) {
                      useRoomStore.getState().setPendingCodeShare({
                        ...currentPending,
                        problemTitle: currentSelectedProblemTitle || 'Unknown Problem',
                        problemId: useRoomStore.getState().selectedStudyProblemId ?? undefined,
                        externalId: selectedProblemExternalId || undefined,
                        isRealtime: true, // Own code is treated as realtime capable
                      });
                    }
                  }, 0);
                }
              }}
              onSubmit={() => {
                void handleSubmit();
              }}
              // New Props for Execute
              showExecute={!isViewingOther && !isMobile}
              isExecuting={isExecuting}
              onToggleConsole={() => setIsConsoleOpen((prev) => !prev)}
              onExecute={() => {
                if (!isConsoleOpen) setIsConsoleOpen(true);
                // Console is now always mounted, so we can dispatch immediately
                window.dispatchEvent(new CustomEvent('study-ide-execute-trigger'));
              }}
              // Toggles
              showSubmit={!isViewingOther && !isMobile}
              showChatRef={!isMobile}
              showThemeToggle={!isMobile}
              showProblemSplit={canSplitOpenProblem}
              onOpenProblemSplit={handleOpenProblemSplit}
            />
          </div>
        </div>



        {/* Editor Body Row */}
        <div className="flex min-h-0 flex-1 min-w-0 relative flex-col">
          <div className="flex min-h-0 flex-1 min-w-0 relative">
            {/* Left IDE Panel (My Code) */}
            {showMyIdePanel && (
              <div
                className={cn(
                  'flex flex-1 min-w-0 flex-col',
                  !isMobile && showRightPanel && 'border-r border-border',
                )}
              >
                <div className="h-8 shrink-0 border-b border-border bg-muted/35 px-3 text-xs text-muted-foreground">
                  <div className="flex h-full items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="shrink-0">내 문제</span>
                    <span className="truncate text-foreground/90" title={myProblemLabel}>
                      {myProblemLabel}
                    </span>
                  </div>
                </div>
                <div className="relative min-h-0 flex-1">
                  {ideContent ?? (
                    <IDEPanel
                      ref={leftPanelRef}
                      editorId="my-editor"
                      language={language}
                      onLanguageChange={handleLanguageChange}
                      theme={theme}
                      fontSize={fontSize}
                      hideToolbar // Pass this so it doesn't render double toolbar
                      onFontSizeChange={handleFontSizeChange}
                      onCodeChange={handleCodeChange}
                      restoredCode={restoredCode}
                      restoreVersion={restoreVersion}
                    />
                  )}

                  {isHydratingDraft && !!selectedStudyProblemId && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                      <p className="text-sm font-medium text-muted-foreground">Loading problem...</p>
                    </div>
                  )}

                  {/* [New] Overlay if no problem is selected and not viewing other */}
                  {!selectedProblemTitle && !isViewingOther && !isWhiteboardVisible && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                      <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        좌측 목록에서 문제를 선택해주세요
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Right Panel: Whiteboard OR Other's Code */}
            {showViewerPanel && (
              <div className="flex min-w-0 flex-1 flex-col">
                {isWhiteboardVisible ? (
                  <WhiteboardPanel className="border-l-2 border-rose-400" />
                ) : (
                  <>
                    <div className="h-8 shrink-0 border-b border-border bg-muted/35 px-3 text-xs text-muted-foreground">
                      <div className="flex h-full items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
                          <span className="shrink-0">
                            {viewMode === 'SPLIT_SAVED' ? savedCodePanelLabel : '상대 문제'}
                          </span>
                          <span className="truncate text-foreground/90" title={otherProblemLabel}>
                            {otherProblemLabel}
                          </span>
                        </div>
                        {isMobile && isViewingOther && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 shrink-0 px-2 text-[11px]"
                            onClick={() => {
                              resetToOnlyMine();
                              setMobileTab('code');
                            }}
                          >
                            내 코드로 돌아가기
                          </Button>
                        )}
                      </div>
                    </div>
                    {viewMode === 'SPLIT_SAVED' ? (
                      <div className="min-h-0 flex-1 flex flex-col">
                        <div className="relative min-h-0 flex-1">
                          <IDEPanel
                            key={`${viewMode}-${targetSubmissionId || 'none'}`}
                            editorId="other-editor"
                            readOnly
                            hideToolbar
                            initialCode={targetSubmission?.code}
                            language={targetSubmission?.language}
                            theme={theme}
                            fontSize={fontSize}
                            onFontSizeChange={handleFontSizeChange}
                            onEditorMount={handleSavedEditorMount}
                            borderColorClass="border-indigo-400"
                          />
                          {hoveredLineForAdd && (
                            <button
                              type="button"
                              title={`L${hoveredLineForAdd}에 인라인 댓글 추가`}
                              className="absolute z-[80] flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30 hover:opacity-90"
                              style={{ top: hoverAddButtonTop, left: hoverAddButtonLeft }}
                              onMouseDown={(event) => {
                                event.stopPropagation();
                              }}
                              onMouseEnter={() => {
                                isHoveringAddButtonRef.current = true;
                                clearHoverHideTimer();
                              }}
                              onMouseLeave={() => {
                                isHoveringAddButtonRef.current = false;
                                hideHoverAddButton();
                              }}
                              onClick={() => {
                                setInlineDraftLine(hoveredLineForAdd);
                                setInlineDraftParentId(null);
                                setInlineEditingCommentId(null);
                                setInlineEditingContent('');
                                focusSavedLine(hoveredLineForAdd);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1">
                        <IDEPanel
                          key={viewMode}
                          editorId="other-editor"
                          readOnly
                          hideToolbar
                          initialCode={realtimeCode}
                          language={realtimeLanguage}
                          theme={theme}
                          fontSize={fontSize}
                          onFontSizeChange={handleFontSizeChange}
                          borderColorClass="border-pink-400"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Console Overlay Drawer */}
          {!isViewingOther && !isMobile && (
            <div
              style={{ height: isConsoleOpen ? consoleHeight : 0, opacity: isConsoleOpen ? 1 : 0 }}
              className={cn(
                "absolute bottom-0 left-0 right-0 z-30 transition-[height,opacity] duration-300 ease-in-out border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] bg-background flex flex-col items-stretch justify-start",
                !isConsoleOpen && "pointer-events-none"
              )}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize bg-transparent hover:bg-primary/50 active:bg-primary z-40 transition-colors" onMouseDown={startResizingConsole} />

              <div className="flex-1 w-full min-h-0 relative h-full">
                <CCConsolePanel
                  roomId={roomId}
                  problemId={selectedStudyProblemId}
                  isOpen={isConsoleOpen} // Keep mounted, just manage visibility
                  onClose={() => setIsConsoleOpen(false)}
                  onExecute={handleExecuteWrapper}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Control Bar */}
      <ControlBar
        onMicToggle={onMicToggle}
        onVideoToggle={onVideoToggle}
        onWhiteboardToggle={handleWhiteboardToggleWrapper}
        onSettingsClick={onSettingsClick}
      />
    </div>
  );
}


