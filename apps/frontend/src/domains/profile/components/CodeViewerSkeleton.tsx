export function CodeViewerSkeleton() {
  return (
    <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]" aria-hidden="true">
      <div className="h-full w-full animate-pulse p-4">
        <div className="mb-3 h-3 w-32 rounded bg-zinc-700/60" />
        <div className="space-y-2">
          <div className="h-2 w-11/12 rounded bg-zinc-800" />
          <div className="h-2 w-8/12 rounded bg-zinc-800" />
          <div className="h-2 w-10/12 rounded bg-zinc-800" />
          <div className="h-2 w-6/12 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
