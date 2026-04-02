'use client';

import { useEffect, useMemo, useState } from 'react';

import { CCIDEPanel } from '@/domains/study/components/CCIDEPanel';
import { CCProblemCard } from '@/domains/study/components/CCProblemCard';
import { ChatInput } from '@/domains/study/components/chat/ChatInput';
import { ChatMessageItem } from '@/domains/study/components/chat/ChatMessageItem';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import type { ChatMessage } from '@/domains/study/types/chat';
import type { StudyProblem } from '@/domains/study/types';

const PROBLEMS: StudyProblem[] = [
  {
    problemId: 1001,
    studyProblemId: 1001,
    externalId: '1001',
    title: 'Two Sum',
    tier: 'Silver 4',
    type: 'BOJ',
    tags: ['implementation', 'math'],
    solvedMemberCount: 2,
    totalMemberCount: 4,
  },
  {
    problemId: 2002,
    studyProblemId: 2002,
    externalId: '2002',
    title: 'Binary Search Lab',
    tier: 'Gold 5',
    type: 'BOJ',
    tags: ['binary-search'],
    solvedMemberCount: 1,
    totalMemberCount: 4,
  },
];

const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    roomId: 1,
    senderId: 2,
    senderName: 'OtherUser',
    content: 'Hello, this is a message to reply to.',
    type: 'TALK',
    createdAt: new Date('2026-04-02T12:00:00.000Z').toISOString(),
  },
  {
    id: 'msg-2',
    roomId: 1,
    senderId: 1,
    senderName: 'Me',
    content: 'I am replying to you.',
    type: 'TALK',
    parentMessage: {
      id: 'msg-1',
      senderId: 2,
      senderName: 'OtherUser',
      content: 'Hello, this is a message to reply to.',
      type: 'TALK',
    },
    createdAt: new Date('2026-04-02T12:01:00.000Z').toISOString(),
  },
  {
    id: 'code-msg-1',
    roomId: 1,
    senderId: 2,
    senderName: 'OtherUser',
    content: 'Check out my solution!',
    type: 'CODE',
    metadata: {
      code: 'def solution():\n    return 42',
      language: 'python',
      problemTitle: 'Two Sum',
      ownerName: 'OtherUser',
      problemId: 1001,
      externalId: '1001',
      isRealtime: true,
    },
    createdAt: new Date('2026-04-02T12:02:00.000Z').toISOString(),
  },
  {
    id: 'code-msg-mine',
    roomId: 1,
    senderId: 1,
    senderName: 'Me',
    content: 'Here is my code.',
    type: 'CODE',
    metadata: {
      code: 'def my_solution():\n    return 1',
      language: 'python',
      problemTitle: 'Two Sum',
      ownerName: 'Me',
      problemId: 1001,
      externalId: '1001',
      isRealtime: true,
    },
    createdAt: new Date('2026-04-02T12:03:00.000Z').toISOString(),
  },
  {
    id: 'msg-ref-code-other',
    roomId: 1,
    senderId: 1,
    senderName: 'Me',
    content: 'This reply references the other user code.',
    type: 'TALK',
    parentMessage: {
      id: 'code-msg-1',
      senderId: 2,
      senderName: 'OtherUser',
      content: 'Check out my solution!',
      type: 'CODE',
    },
    createdAt: new Date('2026-04-02T12:04:00.000Z').toISOString(),
  },
  {
    id: 'msg-ref-talk',
    roomId: 1,
    senderId: 2,
    senderName: 'OtherUser',
    content: 'This one points back to a normal message.',
    type: 'TALK',
    parentMessage: {
      id: 'msg-1',
      senderId: 2,
      senderName: 'OtherUser',
      content: 'Hello, this is a message to reply to.',
      type: 'TALK',
    },
    createdAt: new Date('2026-04-02T12:05:00.000Z').toISOString(),
  },
  {
    id: 'msg-ref-code-mine',
    roomId: 1,
    senderId: 2,
    senderName: 'OtherUser',
    content: 'This one points back to my own code.',
    type: 'TALK',
    parentMessage: {
      id: 'code-msg-mine',
      senderId: 1,
      senderName: 'Me',
      content: 'Here is my code.',
      type: 'CODE',
    },
    createdAt: new Date('2026-04-02T12:06:00.000Z').toISOString(),
  },
];

export default function StudyInteractionsE2EPage() {
  const reset = useRoomStore((state) => state.reset);
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const setParticipants = useRoomStore((state) => state.setParticipants);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);
  const pendingCodeShare = useRoomStore((state) => state.pendingCodeShare);
  const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);
  const replyingTo = useRoomStore((state) => state.replyingTo);
  const setReplyingTo = useRoomStore((state) => state.setReplyingTo);
  const viewMode = useRoomStore((state) => state.viewMode);
  const viewingUser = useRoomStore((state) => state.viewingUser);
  const targetSubmission = useRoomStore((state) => state.targetSubmission);
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const selectedProblemExternalId = useRoomStore((state) => state.selectedProblemExternalId);

  const [lastSentMessage, setLastSentMessage] = useState('');

  useEffect(() => {
    reset();
    setRoomInfo({ roomId: 1, roomTitle: 'E2E Study Room', myRole: 'MEMBER' });
    setCurrentUserId(1);
    setParticipants([
      {
        id: 1,
        nickname: 'Me',
        isOwner: true,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
      },
      {
        id: 2,
        nickname: 'OtherUser',
        isOwner: false,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
      },
    ]);

    return () => {
      reset();
    };
  }, [reset, setCurrentUserId, setParticipants, setRoomInfo]);

  const messageLookup = useMemo(
    () => Object.fromEntries(CHAT_MESSAGES.map((message) => [message.id as string, message])),
    [],
  );

  const handleSelectProblem = (problem: StudyProblem) => {
    setSelectedProblem(problem.studyProblemId || problem.problemId, problem.problemId, problem.title, problem.externalId);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Study Interactions E2E</p>
          <h1 className="text-3xl font-semibold">Chat reply, code reference, and IDE share harness</h1>
          <p className="max-w-4xl text-sm text-slate-300">
            This page exposes deterministic UI state for Playwright so reply preview, reference
            navigation, problem selection, and code share flows can run without the full realtime
            study-room stack.
          </p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">View Mode</p>
            <p data-testid="view-mode" className="mt-1 text-xl font-semibold">
              {viewMode}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Viewing User</p>
            <p data-testid="viewing-user" className="mt-1 text-xl font-semibold">
              {viewingUser?.nickname || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Saved Target</p>
            <p data-testid="saved-target" className="mt-1 text-xl font-semibold">
              {targetSubmission?.problemTitle || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending Share</p>
            <p data-testid="pending-share-owner" className="mt-1 text-xl font-semibold">
              {pendingCodeShare?.ownerName || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Replying To</p>
            <p data-testid="replying-to" className="mt-1 text-xl font-semibold">
              {replyingTo?.id || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected Problem</p>
            <p data-testid="selected-problem" className="mt-1 text-xl font-semibold">
              {selectedProblemExternalId
                ? `${selectedProblemExternalId}. ${selectedProblemTitle}`
                : selectedProblemTitle || '-'}
            </p>
            <p data-testid="selected-problem-id" className="text-xs text-slate-400">
              {selectedStudyProblemId || '-'}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold">Problems</h2>
              <p className="mt-1 text-sm text-slate-400">Click a card to seed the IDE share metadata.</p>
              <div className="mt-4 space-y-3">
                {PROBLEMS.map((problem) => (
                  <div key={problem.studyProblemId} data-testid={`problem-card-${problem.externalId}`}>
                    <CCProblemCard
                      problem={problem}
                      isSelected={selectedStudyProblemId === problem.studyProblemId}
                      onSelect={() => handleSelectProblem(problem)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold">Chat Input</h2>
              <p className="mt-1 text-sm text-slate-400">
                Reply preview and pending code share preview are rendered here.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-background text-foreground">
                <ChatInput
                  onSend={(message) => {
                    setLastSentMessage(message);
                    setReplyingTo(null);
                    setPendingCodeShare(null);
                  }}
                  pendingCodeShare={pendingCodeShare}
                  onCancelShare={() => setPendingCodeShare(null)}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last Sent</p>
                <p data-testid="last-sent-message" className="mt-2 text-slate-200">
                  {lastSentMessage || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold">IDE</h2>
              <p className="mt-1 text-sm text-slate-400">
                Use the toolbar share button to stage a code share into chat.
              </p>
            </div>
            <div className="h-[640px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <CCIDEPanel
                editorId="study-interactions-e2e"
                initialCode={'def solve():\n    return "shared"'}
                language="python"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-lg font-semibold">Chat Timeline</h2>
            <p className="mt-1 text-sm text-slate-400">
              Messages are static, but they drive the real store transitions for reply and code view.
            </p>
            <div
              data-testid="chat-timeline"
              className="mt-4 flex h-[780px] flex-col overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              {CHAT_MESSAGES.map((message) => (
                <div
                  key={message.id}
                  data-msg-id={message.id}
                  className={message.senderId === 1 ? 'flex justify-end' : 'flex justify-start'}
                >
                  <ChatMessageItem
                    message={message}
                    isMine={message.senderId === 1}
                    messageLookup={messageLookup}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
