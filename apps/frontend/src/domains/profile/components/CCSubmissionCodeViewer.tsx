'use client';

import Editor from '@monaco-editor/react';

import type { SubmissionHistory } from '../types';

interface CCSubmissionCodeViewerProps {
  submission: SubmissionHistory;
}

export function CCSubmissionCodeViewer({ submission }: CCSubmissionCodeViewerProps) {
  return (
    <div className="flex-1 overflow-hidden relative group bg-[#1e1e1e]">
      <Editor
        height="100%"
        language={submission.language.toLowerCase()}
        theme="vs-dark"
        value={submission.code || '// 코드를 불러올 수 없습니다.'}
        options={{
          readOnly: true,
          fontFamily: "'D2Coding', 'Fira Code', Consolas, monospace",
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => navigator.clipboard.writeText(submission.code || '')}
          className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700 hover:bg-zinc-700 shadow-sm"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

export default CCSubmissionCodeViewer;
