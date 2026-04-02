'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchStudyRoom, refreshStudyRoomSnapshot } from '@/domains/study/api/studyApi';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { mapStudyRoomToParticipantPatches } from '@/domains/study/utils/participantSync';

const E2E_STUDY_ID_MIN = 999900;

type Phase = 'idle' | 'running' | 'complete' | 'error';

export default function StudyRoomSyncE2EPage() {
  const reset = useRoomStore((state) => state.reset);
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const setCurrentUserId = useRoomStore((state) => state.setCurrentUserId);
  const replaceParticipantsFromSnapshot = useRoomStore(
    (state) => state.replaceParticipantsFromSnapshot,
  );
  const patchParticipants = useRoomStore((state) => state.patchParticipants);
  const syncParticipantsOnline = useRoomStore((state) => state.syncParticipantsOnline);
  const participants = useRoomStore((state) => state.participants);

  const [studyId] = useState(() => E2E_STUDY_ID_MIN + Math.floor(Math.random() * 1000));
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [roomRequestCount, setRoomRequestCount] = useState(0);
  const [bootstrapRequestCount, setBootstrapRequestCount] = useState(0);
  const [refreshInvocationCount, setRefreshInvocationCount] = useState(0);
  const [fallbackNetworkRequestCount, setFallbackNetworkRequestCount] = useState(0);
  const [didDedupeFallback, setDidDedupeFallback] = useState(false);
  const [lastHydratedNickname, setLastHydratedNickname] = useState('-');

  const requestCountRef = useRef(0);
  const hasAutoRunRef = useRef(false);

  useEffect(() => {
    requestCountRef.current = roomRequestCount;
  }, [roomRequestCount]);

  useEffect(() => {
    reset();
    setCurrentUserId(1);

    return () => {
      reset();
    };
  }, [reset, setCurrentUserId]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const countingFetch: typeof window.fetch = async (input, init) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (rawUrl.includes(`/api/studies/${studyId}`)) {
        requestCountRef.current += 1;
        setRoomRequestCount(requestCountRef.current);

        const resolvedUrl = new URL(rawUrl, window.location.origin);
        resolvedUrl.searchParams.set('e2eStudySync', '1');

        if (input instanceof Request) {
          return originalFetch(new Request(resolvedUrl.toString(), input), init);
        }

        return originalFetch(resolvedUrl.toString(), init);
      }

      return originalFetch(input, init);
    };

    window.fetch = countingFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [studyId]);

  const ownerName = useMemo(
    () => participants.find((participant) => participant.isOwner)?.nickname || '-',
    [participants],
  );

  const appendLog = useCallback((message: string) => {
    setLogs((currentLogs) => [...currentLogs, message]);
  }, []);

  const hydrateRoom = useCallback(
    (
      room: Awaited<ReturnType<typeof fetchStudyRoom>>,
      options: { replaceMissing?: boolean } = {},
    ) => {
      setRoomInfo({
        roomId: room.id,
        roomTitle: room.title,
        roomDescription: room.description ?? '',
        myRole: room.role,
      });
      replaceParticipantsFromSnapshot(mapStudyRoomToParticipantPatches(room), {
        replaceMissing: options.replaceMissing ?? true,
      });
    },
    [replaceParticipantsFromSnapshot, setRoomInfo],
  );

  const runFlow = useCallback(async () => {
    setPhase('running');
    setErrorMessage('');
    setLogs([]);
    setRoomRequestCount(0);
    setBootstrapRequestCount(0);
    setRefreshInvocationCount(0);
    setFallbackNetworkRequestCount(0);
    setDidDedupeFallback(false);
    setLastHydratedNickname('-');
    requestCountRef.current = 0;

    reset();
    setCurrentUserId(1);
    setRoomInfo({ roomId: studyId, roomTitle: '', roomDescription: '', myRole: 'MEMBER' });

    try {
      appendLog('1. Bootstrap: fetchStudyRoom() hydrates room metadata and participants.');
      const bootstrapRoom = await fetchStudyRoom(studyId);
      hydrateRoom(bootstrapRoom);
      setBootstrapRequestCount(requestCountRef.current);
      appendLog(
        `   Bootstrap finished with ${bootstrapRoom.members.length} members and ${requestCountRef.current} room request.`,
      );

      appendLog('2. ONLINE_USERS patch applies online status without a room refetch.');
      syncParticipantsOnline([1, 2]);

      appendLog('3. STATUS patch updates mute/video state for OtherUser.');
      patchParticipants([{ id: 2, isMuted: true, isVideoOff: true }]);

      appendLog('4. DELEGATE patch flips owner bits without fetching room detail again.');
      const currentParticipants = useRoomStore.getState().participants;
      patchParticipants(
        currentParticipants.map((participant) => ({
          id: participant.id,
          isOwner: participant.id === 2,
        })),
      );

      appendLog(
        '5. Unknown participant 3 appears in ONLINE_USERS and is created as a placeholder.',
      );
      syncParticipantsOnline([1, 2, 3]);

      appendLog('6. Two fallback refresh callers fire concurrently.');
      setRefreshInvocationCount(2);
      const requestCountBeforeFallback = requestCountRef.current;
      const [refreshedRoom] = await Promise.all([
        refreshStudyRoomSnapshot(studyId),
        refreshStudyRoomSnapshot(studyId),
      ]);
      const actualFallbackRequests = requestCountRef.current - requestCountBeforeFallback;
      setFallbackNetworkRequestCount(actualFallbackRequests);
      setDidDedupeFallback(actualFallbackRequests === 1);

      hydrateRoom(refreshedRoom, { replaceMissing: false });

      const hydratedCharlie = useRoomStore
        .getState()
        .participants.find((participant) => participant.id === 3)?.nickname;
      setLastHydratedNickname(hydratedCharlie || '-');

      appendLog(
        `   Concurrent fallback completed with ${actualFallbackRequests} network request and hydrated participant 3 as ${hydratedCharlie || 'unknown'}.`,
      );
      appendLog('7. Final participant roster converged without an extra bootstrap fetch.');
      setPhase('complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      appendLog(`Error: ${message}`);
      setPhase('error');
    }
  }, [
    appendLog,
    hydrateRoom,
    patchParticipants,
    reset,
    setCurrentUserId,
    setRoomInfo,
    studyId,
    syncParticipantsOnline,
  ]);

  useEffect(() => {
    if (hasAutoRunRef.current) return;
    hasAutoRunRef.current = true;
    void runFlow();
  }, [runFlow]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Study Room Sync E2E</p>
          <h1 className="text-3xl font-semibold">
            Bootstrap and presence sync optimization in a real client flow
          </h1>
          <p className="max-w-5xl text-sm text-slate-300">
            This page uses the production room snapshot helpers, store patch actions, and
            `refreshStudyRoomSnapshot()` dedupe path to show the optimized study-room convergence
            flow end-to-end.
          </p>
          <p className="text-xs text-slate-500">Fixture Study ID: {studyId}</p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phase</p>
            <p data-testid="sync-phase" className="mt-1 text-2xl font-semibold">
              {phase.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bootstrap Requests</p>
            <p data-testid="bootstrap-request-count" className="mt-1 text-2xl font-semibold">
              {bootstrapRequestCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Room Requests</p>
            <p data-testid="total-room-request-count" className="mt-1 text-2xl font-semibold">
              {roomRequestCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Refresh Callers</p>
            <p data-testid="refresh-invocation-count" className="mt-1 text-2xl font-semibold">
              {refreshInvocationCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fallback Requests</p>
            <p data-testid="fallback-network-request-count" className="mt-1 text-2xl font-semibold">
              {fallbackNetworkRequestCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dedupe Result</p>
            <p data-testid="dedupe-result" className="mt-1 text-2xl font-semibold">
              {didDedupeFallback ? 'DEDUPED' : phase === 'complete' ? 'MISSED' : '-'}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Participant Roster</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Placeholder participant 3 should hydrate to Charlie after the deduped fallback
                    refresh completes.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="run-sync-flow"
                  onClick={() => {
                    void runFlow();
                  }}
                  disabled={phase === 'running'}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {phase === 'running' ? 'Running...' : 'Run Sync Flow'}
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
                  <p data-testid="owner-name" className="mt-2 text-xl font-semibold">
                    {ownerName}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Participants</p>
                  <p data-testid="participant-count" className="mt-2 text-xl font-semibold">
                    {participants.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Hydrated User 3
                  </p>
                  <p data-testid="hydrated-third-user" className="mt-2 text-xl font-semibold">
                    {lastHydratedNickname}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-950/80 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Nickname</th>
                      <th className="px-4 py-3 text-left font-medium">Owner</th>
                      <th className="px-4 py-3 text-left font-medium">Online</th>
                      <th className="px-4 py-3 text-left font-medium">Muted</th>
                      <th className="px-4 py-3 text-left font-medium">Video Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {participants.map((participant) => (
                      <tr key={participant.id} data-testid={`participant-row-${participant.id}`}>
                        <td className="px-4 py-3 text-slate-300">{participant.id}</td>
                        <td
                          className="px-4 py-3 font-medium text-slate-50"
                          data-testid={`participant-name-${participant.id}`}
                        >
                          {participant.nickname}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {participant.isOwner ? 'YES' : 'NO'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {participant.isOnline ? 'YES' : 'NO'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {participant.isMuted ? 'YES' : 'NO'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {participant.isVideoOff ? 'YES' : 'NO'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold">Flow Log</h2>
              <p className="mt-1 text-sm text-slate-400">
                The optimized path should bootstrap once, patch presence locally, and share one
                fallback refresh between two callers.
              </p>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <ol data-testid="flow-log" className="space-y-3 text-sm text-slate-200">
                  {logs.map((log) => (
                    <li key={log} className="whitespace-pre-wrap break-words">
                      {log}
                    </li>
                  ))}
                </ol>
                {errorMessage ? (
                  <p data-testid="sync-error" className="mt-4 text-sm text-rose-300">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-lg font-semibold">What This Demonstrates</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>First room snapshot seeds both room info and participant roster.</li>
                <li>`ONLINE_USERS`, `STATUS`, and `DELEGATE` only patch participant fields.</li>
                <li>
                  Unknown users can appear as placeholders before a shared fallback snapshot
                  hydrates metadata.
                </li>
                <li>
                  Two concurrent fallback callers still result in one actual room-detail network
                  request.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
