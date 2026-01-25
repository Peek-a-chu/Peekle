'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useParams } from 'next/navigation'; // Import useParams

import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { toast } from 'sonner';

// Moved to a higher level or context if needed, but keeping here for now

// (IDEToolbar has been moved to IDEToolbar.tsx)

const DEFAULT_CODE = {
  python: `# Enter your Python code here\nprint("Hello, World!")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
};

export interface CCIDEPanelRef {
  handleCopy: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleRefChat: () => void;
  toggleTheme: () => void;
  setLanguage: (lang: string) => void;
}

interface CCIDEPanelProps {
  initialCode?: string;
  readOnly?: boolean;
  hideToolbar?: boolean;
  language?: string;
  theme?: 'light' | 'vs-dark';
  onEditorMount?: (editor: any) => void;
  onLanguageChange?: (lang: string) => void; // Optional if passing new props from generic Handler
  onThemeChange?: (theme: 'light' | 'vs-dark') => void;
}

export const CCIDEPanel = forwardRef<CCIDEPanelRef, CCIDEPanelProps>(({
  initialCode,
  readOnly = false,
  hideToolbar = false,
  language: propLanguage,
  theme: propTheme,
  onEditorMount,
  onLanguageChange: propOnLanguageChange,
  onThemeChange: propOnThemeChange,
}, ref) => {
  const [internalLanguage, setInternalLanguage] = useState('python');
  const [internalTheme, setInternalTheme] = useState<'light' | 'vs-dark'>('light');
  const [code, setCode] = useState(initialCode || DEFAULT_CODE.python);
  const editorRef = useRef<any>(null);
  const setRightPanelActiveTab = useRoomStore((state) => state.setRightPanelActiveTab);
  const params = useParams(); // Get params
  const studyId = params.id as string; // Extract studyId

  const language = propLanguage || internalLanguage;
  const theme = propTheme || internalTheme;

  // Update code when initialCode changes (esp for readOnly view)
  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (propLanguage) {
      // If switching language from prop, only reset code if it was default
      // But for simplicity, we respect internal logic unless it's a forced change
      // For shared state, parent logic controls this best.
      // Here we just ensure we display correct code for the language if logic requires.
      // But if `code` state is local, we need to be careful.
      // Assuming parent handles code syncing if `propLanguage` is used.
      // Actually, let's keep the simple logic: if lang changes and code matches default of old lang, update to new default.
      setCode((prev) =>
        prev === DEFAULT_CODE[internalLanguage as keyof typeof DEFAULT_CODE]
          ? DEFAULT_CODE[propLanguage as keyof typeof DEFAULT_CODE]
          : prev
      );
      setInternalLanguage(propLanguage);
    }
  }, [propLanguage]);

  // Store listeners for cleanup
  const listenersRef = useRef<{
    preventClipboard: (e: Event) => void;
    stopKeyPropagation: (e: Event) => void;
    container: HTMLElement | null;
  } | null>(null);

  const handleEditorDidMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor;
    if (onEditorMount) onEditorMount(editor);

    // DOM-level event blocking for Clipboard only (as requested)
    const container = editor.getContainerDomNode();

    const preventClipboard = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const stopKeyPropagation = (e: Event) => {
      e.stopPropagation();
    };

    container.addEventListener('copy', preventClipboard);
    container.addEventListener('cut', preventClipboard);
    container.addEventListener('paste', preventClipboard);
    container.addEventListener('keydown', stopKeyPropagation);

    // Store for cleanup
    listenersRef.current = {
      preventClipboard,
      stopKeyPropagation,
      container
    };
  };

  useEffect(() => {
    return () => {
      if (listenersRef.current) {
        const { preventClipboard, stopKeyPropagation, container } = listenersRef.current;
        if (container) {
          container.removeEventListener('copy', preventClipboard);
          container.removeEventListener('cut', preventClipboard);
          container.removeEventListener('paste', preventClipboard);
          container.removeEventListener('keydown', stopKeyPropagation);
        }
      }
    };
  }, []);

  const handleLanguageChange = (val: string) => {
    setInternalLanguage(val);
    setCode(DEFAULT_CODE[val as keyof typeof DEFAULT_CODE]);
    if (propOnLanguageChange) propOnLanguageChange(val);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'vs-dark' : 'light';
    setInternalTheme(newTheme);
    if (propOnThemeChange) propOnThemeChange(newTheme);
  };

  const handleCopy = async () => {
    if (editorRef.current) {
      const value = editorRef.current.getValue();
      try {
        await navigator.clipboard.writeText(value);
        toast.success('코드가 클립보드에 복사되었습니다.');
      } catch (err) {
        console.error('Failed to copy!', err);
        toast.error('코드 복사에 실패했습니다.');
      }
    }
  };

  const handleRefChat = () => {
    // Switch to chat tab first using the store action
    setRightPanelActiveTab('chat');

    setTimeout(() => {
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.focus();
      } else {
        console.warn('Chat input not found');
      }
    }, 0);
  };

  const handleSubmit = async () => {
    if (editorRef.current) {
      const value = editorRef.current.getValue();
      // TODO: Get actual problem ID from store or context. currently hardcoded to 1000 for testing.
      // In a real scenario, this '1' in /study/1 would likely map to a problem ID or the problem ID is in the store.
      // Assuming problem 1000 for now as per user request.
      const problemId = '1000'; // TODO: Dynamic Problem ID associated with current room

      // 확장 프로그램에 메시지 전송 (확장 프로그램이 수신 후 스토리지 저장 -> 페이지 이동 처리)
      window.postMessage({
        type: 'PEEKLE_SUBMIT_CODE',
        payload: {
          problemId,
          code: value,
          language: language, // 'python', 'java', 'cpp' 등
          studyId: studyId // <--- Inject Study ID from params
        }
      }, '*');

      toast.info('자동 제출을 시작합니다...');
    }
  };

  useImperativeHandle(ref, () => ({
    handleCopy,
    handleSubmit,
    handleRefChat,
    toggleTheme,
    setLanguage: handleLanguageChange
  }));

  return (
    <div className={cn(
      "flex h-full flex-col bg-background min-w-0",
      readOnly && "border-2 border-yellow-400 rounded-lg" // Add yellow border when readOnly
    )}>
      {/* Toolbar */}
      {!hideToolbar && !readOnly && (
        <IDEToolbar
          language={language}
          theme={theme}
          onLanguageChange={(val) => handleLanguageChange(val)} // pass value from event or direct
          onThemeToggle={toggleTheme}
          onCopy={handleCopy}
          onRefChat={handleRefChat}
          onSubmit={handleSubmit}
        />
      )}

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden"
        onMouseEnter={() => editorRef.current?.focus()}
      >
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontFamily: "'D2Coding', 'Fira Code', Consolas, monospace",
            fontSize: 14,
            minimap: { enabled: false },
            dragAndDrop: false,
            contextmenu: false,
            // Prevent some keyboard shortcuts if needed, but DOM listener handles copy/paste
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
});

CCIDEPanel.displayName = 'CCIDEPanel';