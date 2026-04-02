'use client';

import { useEffect, useRef, useState } from 'react';

import { CCIDEPanel, type CCIDEPanelRef } from '@/domains/study/components/CCIDEPanel';

const REMOTE_PACKETS = [
  'print("a")',
  'print("ab")',
  'print("abc")',
  'print("abcd")',
];

export default function ReadonlyEditorE2EPage() {
  const panelRef = useRef<CCIDEPanelRef>(null);
  const [packetIndex, setPacketIndex] = useState(0);
  const [mountCount, setMountCount] = useState(0);
  const [observedEditorValue, setObservedEditorValue] = useState(REMOTE_PACKETS[0]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setObservedEditorValue(panelRef.current?.getValue() ?? '');
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [packetIndex, mountCount]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Readonly Editor E2E</p>
          <h1 className="text-3xl font-semibold">Realtime packet remount regression test</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            This page simulates readonly realtime code packets and exposes mount count so
            Playwright can verify Monaco stays mounted while the incoming code changes.
          </p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mount Count</p>
            <p data-testid="mount-count" className="mt-1 text-3xl font-semibold">
              {mountCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active Packet</p>
            <p data-testid="packet-index" className="mt-1 text-3xl font-semibold">
              {packetIndex}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Language</p>
            <p data-testid="packet-language" className="mt-1 text-3xl font-semibold">
              python
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-wrap gap-3">
            {REMOTE_PACKETS.map((packet, index) => (
              <button
                key={packet}
                type="button"
                data-testid={`apply-packet-${index}`}
                onClick={() => setPacketIndex(index)}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Apply packet {index}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Incoming Packet</p>
              <pre
                data-testid="incoming-packet"
                className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-sm text-emerald-200"
              >
                {REMOTE_PACKETS[packetIndex]}
              </pre>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Observed Editor Value</p>
              <pre
                data-testid="observed-editor-value"
                className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-sm text-amber-200"
              >
                {observedEditorValue}
              </pre>
            </div>
          </div>
        </section>

        <section className="h-[560px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <CCIDEPanel
            ref={panelRef}
            readOnly
            hideToolbar
            editorId="readonly-e2e"
            initialCode={REMOTE_PACKETS[packetIndex]}
            language="python"
            onEditorMount={() => {
              setMountCount((current) => current + 1);
            }}
          />
        </section>
      </div>
    </main>
  );
}
