'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useParams } from 'next/navigation'; // Import useParams
import { toast } from 'sonner';

import { CCIDEToolbar as IDEToolbar } from '@/domains/study/components/CCIDEToolbar';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

// ----------------------------------------------------------------------
// 타입 및 상수 정의
// ----------------------------------------------------------------------

type LanguageKey = 'python' | 'java' | 'cpp';

const DEFAULT_CODE: Record<LanguageKey, string> = {
  python: `import sys\n\n# 코드를 작성해주세요\nprint("Hello World")`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // 코드를 작성해주세요\n        System.out.println("Hello World");\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    // 코드를 작성해주세요\n    cout << "Hello World" << endl;\n    return 0;\n}`,
};

const getSafeLanguageKey = (lang: string): LanguageKey => {
  const normalized = lang.toLowerCase();
  if (normalized.includes('java') && !normalized.includes('script')) return 'java';
  if (normalized.includes('cpp') || normalized.includes('c++')) return 'cpp';
  return 'python';
};

const getFileExtension = (lang: string) => {
  const key = getSafeLanguageKey(lang);
  switch (key) {
    case 'cpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'python':
    default:
      return 'py';
  }
};

const normalizeCode = (str: string) => str.replace(/\r\n/g, '\n').trim();

export interface CCIDEPanelRef {
  handleCopy: () => Promise<void>;
  handleSubmit: () => void;
  handleRefChat: () => void;
  toggleTheme: () => void;
  setLanguage: (lang: string) => void;
  setValue: (code: string) => void; // Added for restoration
}

interface CCIDEPanelProps {
  initialCode?: string;
  readOnly?: boolean;
  hideToolbar?: boolean;
  language?: string;
  theme?: 'light' | 'vs-dark';
  borderColorClass?: string;
  onEditorMount?: (editor: Parameters<OnMount>[0]) => void;
  onLanguageChange?: (lang: string) => void;
  onThemeChange?: (theme: 'light' | 'vs-dark') => void;
  onCodeChange?: (code: string) => void;
  editorId?: string;
  restoredCode?: string | null;
  restoreVersion?: number;
}

export const CCIDEPanel = forwardRef<CCIDEPanelRef, CCIDEPanelProps>(
  (
    {
      initialCode,
      readOnly = false,
      hideToolbar = false,
      language: propLanguage,
      theme: propTheme,
      borderColorClass,
      onEditorMount,
      onLanguageChange: propOnLanguageChange,
      onThemeChange: propOnThemeChange,
      onCodeChange,
      editorId = 'default',
      restoredCode,
      restoreVersion,
    },
    ref,
  ) => {
    // ----------------------------------------------------------------------
    // 상태 관리
    // ----------------------------------------------------------------------
    const [internalLanguage, setInternalLanguage] = useState<string>('python');
    const [internalTheme, setInternalTheme] = useState<'light' | 'vs-dark'>('light');
    const params = useParams();
    const studyId = params.id as string;
    const language = propLanguage || internalLanguage;
    const theme = propTheme || internalTheme;

    // 현재 화면에 보여지는 코드
    const [code, setCode] = useState(initialCode || DEFAULT_CODE.python);

    // [Realtime Fix] - 통합됨 (아래 useEffect에서 처리)
    // 기존에 있던 readOnly 전용 이펙트는 아래의 일반 initialCode 이펙트와 중복되므로 제거하거나 병합합니다.
    // useEffect(() => {
    //   if (readOnly && initialCode !== undefined) {
    //     setCode(initialCode);
    //   }
    // }, [initialCode, readOnly]);

    // [Restoration Fix] 복구된 코드가 들어오면 에디터에 적용
    // restoredCode === '' 은 해당 문제에 저장된 코드가 없음을 의미 -> 기본 코드로 초기화
    // restoreVersion이 변경될 때마다 무조건 실행 (같은 코드여도 문제 전환 시 새로 적용)
    const lastRestoreVersionRef = useRef<number | undefined>(undefined);
    useEffect(() => {
      if (restoredCode === null || restoredCode === undefined) return;
      if (restoreVersion === lastRestoreVersionRef.current) return;

      lastRestoreVersionRef.current = restoreVersion;

      const newCode =
        restoredCode === '' ? DEFAULT_CODE[getSafeLanguageKey(language)] : restoredCode;

      console.log(
        '[CCIDEPanel] Restoring code, remounting editor...',
        restoredCode === '' ? '(using default)' : '',
      );
      setCode(newCode);
      originCodeRef.current = newCode;
      isDirtyRef.current = false;

      // 모델 ID를 변경하여 에디터를 강제로 다시 마운트합니다.
      // setValue만으로 해결되지 않는 렌더링 타이밍 이슈를 원천 차단합니다.
      setModelId((prev) => prev + 1);

      // 상위 컴포넌트(CCCenterPanel)에도 알림
      if (onCodeChange) {
        onCodeChange(newCode);
      }
    }, [restoredCode, restoreVersion, language, onCodeChange]);

    // [핵심] Monaco Editor 경로 캐싱 방지용 ID
    const [modelId, setModelId] = useState(0);

    // 원본 코드 비교 및 변경 감지 Refs
    const originCodeRef = useRef<string>(initialCode || DEFAULT_CODE.python);
    const isDirtyRef = useRef(false);

    // [핵심 해결책 1] 언어 변경 중임을 표시하는 플래그
    // 이 플래그가 true일 때는 initialCode가 들어와도 무시합니다.
    const isSwitchingLanguageRef = useRef(false);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const readOnlyRef = useRef(readOnly);
    const setRightPanelActiveTab = useRoomStore((state) => state.setRightPanelActiveTab);
    const setPendingCodeShare = useRoomStore((state) => state.setPendingCodeShare);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ----------------------------------------------------------------------
    // 초기화 및 Props 동기화 로직
    // ----------------------------------------------------------------------

    useEffect(() => {
      // [핵심 해결책 1 적용]
      // 언어 변경 중이거나, initialCode가 없는 경우 무시
      if (isSwitchingLanguageRef.current) return;

      if (initialCode !== undefined) {
        setCode(initialCode);
        originCodeRef.current = initialCode;
        // 외부에서 새 코드가 들어오면 Dirty 상태 해제
        isDirtyRef.current = false;

        // 에디터가 이미 떠있다면 값 강제 업데이트
        if (editorRef.current && editorRef.current.getValue() !== initialCode) {
          editorRef.current.setValue(initialCode);
        }
      }
    }, [initialCode]);

    useEffect(() => {
      readOnlyRef.current = readOnly;
    }, [readOnly]);

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
            : prev,
        );
        setInternalLanguage(propLanguage);
      }
    }, [propLanguage, internalLanguage, onCodeChange]);

    // ----------------------------------------------------------------------
    // 언어 변경 로직
    // ----------------------------------------------------------------------

    const proceedLanguageChange = (newLang: string): void => {
      // 1. 플래그 설정: "지금부터 언어 바꿀 거니까 외부 prop 간섭하지 마라"
      isSwitchingLanguageRef.current = true;

      const safeKey = getSafeLanguageKey(newLang);
      const newCode = DEFAULT_CODE[safeKey];

      setInternalLanguage(newLang);

      // 2. State 업데이트: 새 언어의 스켈레톤 코드로 교체
      setCode(newCode);

      if (onCodeChange) {
        onCodeChange(newCode);
      }

      // 3. 원본 기준점 리셋
      originCodeRef.current = newCode;
      isDirtyRef.current = false;

      // 4. 모델 ID 증가 -> Editor 컴포넌트 강제 재마운트 유도
      setModelId((prev) => prev + 1);

      if (propOnLanguageChange) {
        propOnLanguageChange(newLang);
      }

      setIsConfirmModalOpen(false);
      setPendingLanguage(null);

      // 5. 안전장치: 잠시 후 플래그 해제 (React 렌더링 사이클 고려)
      setTimeout(() => {
        isSwitchingLanguageRef.current = false;
      }, 500);
    };

    const handleLanguageChangeAttempt = (targetLang: string): void => {
      if (readOnly) {
        proceedLanguageChange(targetLang);
        return;
      }
      if (targetLang === language) return;

      // [Safe Guard] 현재 코드가 해당 언어의 기본 스켈레톤과 다르면 모달 띄움
      // 복원(Restore)된 코드일 수도 있으므로, 단순 변경 여부(isDirty)가 아닌 내용 자체를 비교함
      let isRiskOfDataLoss = false;

      if (editorRef.current) {
        const currentVal = normalizeCode(editorRef.current.getValue());

        // 현재 언어 기준으로 스켈레톤 가져오기
        const currentLangKey = getSafeLanguageKey(language);
        const defaultVal = normalizeCode(DEFAULT_CODE[currentLangKey]);

        if (currentVal !== defaultVal) {
          isRiskOfDataLoss = true;
        }
      }

      if (isRiskOfDataLoss) {
        setPendingLanguage(targetLang);
        setIsConfirmModalOpen(true);
      } else {
        proceedLanguageChange(targetLang);
      }
    };

    const confirmLanguageChange = (): void => {
      if (pendingLanguage) {
        proceedLanguageChange(pendingLanguage);
      }
    };

    // ----------------------------------------------------------------------
    // 기타 핸들러
    // ----------------------------------------------------------------------
    const toggleTheme = (): void => {
      const newTheme = theme === 'light' ? 'vs-dark' : 'light';
      setInternalTheme(newTheme);
      if (propOnThemeChange) propOnThemeChange(newTheme);
    };

    const handleCopy = async (): Promise<void> => {
      if (editorRef.current) {
        const value = editorRef.current.getValue();
        try {
          await navigator.clipboard.writeText(value);
          toast.success('코드가 클립보드에 복사되었습니다.');
        } catch {
          toast.error('코드 복사에 실패했습니다.');
        }
      }
    };

    const handleRefChat = (): void => {
      if (editorRef.current) {
        const currentCode = editorRef.current.getValue();
        const { selectedProblemId, selectedProblemTitle } = useRoomStore.getState();
        setPendingCodeShare({
          code: currentCode,
          language,
          ownerName: 'Me',
          isRealtime: true,
          problemId: selectedProblemId ?? undefined,
          problemTitle: selectedProblemTitle ?? undefined,
        });
      }
      setRightPanelActiveTab('chat');
      setTimeout(() => {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
      }, 0);
    };

    const handleSubmit = (): void => {
      if (editorRef.current) {
        const value = editorRef.current.getValue();
        const { selectedProblemId } = useRoomStore.getState();

        if (!selectedProblemId) {
          toast.error('선택된 문제가 없습니다.');
          return;
        }

        const problemId = String(selectedProblemId);

        // 확장 프로그램에 메시지 전송 (확장 프로그램이 수신 후 스토리지 저장 -> 페이지 이동 처리)
        window.postMessage(
          {
            type: 'PEEKLE_SUBMIT_CODE',
            payload: {
              problemId,
              code: value,
              language: language, // 'python', 'java', 'cpp' 등
              studyId: studyId, // <--- Inject Study ID from params
            },
          },
          '*',
        );

        toast.info('자동 제출을 시작합니다...');
      }
    };

    // ----------------------------------------------------------------------
    // Editor Mount
    // ----------------------------------------------------------------------

    const handleEditorDidMount: OnMount = (editor): void => {
      editorRef.current = editor;
      if (onEditorMount) onEditorMount(editor);

      // [핵심 해결책 2] 마운트 시점에 state에 있는 값을 강제로 주입
      // 위에서 setCode로 업데이트된 상태가 여기(value prop)에 반영되겠지만,
      // 확실한 동기화를 위해 한 번 더 설정합니다.
      editor.setValue(code);

      if (!readOnly && onCodeChange) {
        onCodeChange(code);
      }

      const container = editor.getContainerDomNode();
      const preventClipboard = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
      };
      const handleKeyDown = (e: KeyboardEvent): void => {
        if (!readOnlyRef.current) return;
        const allowedKeys = [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          'Shift',
          'Control',
          'Alt',
          'Meta',
          'Escape',
          'Tab',
          'F1',
          'F2',
          'F3',
          'F4',
          'F5',
          'F6',
          'F7',
          'F8',
          'F9',
          'F10',
          'F11',
          'F12',
        ];
        if (allowedKeys.includes(e.key)) return;
        const isModifier = e.ctrlKey || e.metaKey || e.altKey;
        if (isModifier && ['c', 'a'].includes(e.key.toLowerCase())) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toast.warning('타인의 코드에 작성할 수 없습니다.', {
          id: 'readonly-warning',
          duration: 1000,
        });
      };

      container.addEventListener('copy', preventClipboard);
      container.addEventListener('cut', preventClipboard);
      container.addEventListener('paste', preventClipboard);
      container.addEventListener('keydown', handleKeyDown as EventListener, true);
    };

    useImperativeHandle(ref, () => ({
      handleCopy,
      handleSubmit,
      handleRefChat,
      toggleTheme,
      setLanguage: handleLanguageChangeAttempt,
      setValue: (newCode: string) => {
        setCode(newCode);
        originCodeRef.current = newCode;
        if (editorRef.current) {
          editorRef.current.setValue(newCode);
        }
      },
    }));

    return (
      <div
        className={cn(
          'flex h-full flex-col bg-background min-w-0',
          borderColorClass
            ? `border-2 ${borderColorClass} rounded-lg`
            : readOnly
              ? 'border-2 border-yellow-400 rounded-lg'
              : '',
        )}
      >
        {!hideToolbar && !readOnly && (
          <IDEToolbar
            language={language}
            theme={theme}
            onLanguageChange={handleLanguageChangeAttempt}
            onThemeToggle={toggleTheme}
            onCopy={() => void handleCopy()}
            onRefChat={handleRefChat}
            onSubmit={() => void handleSubmit()}
          />
        )}

        <div className="flex-1 overflow-hidden" onMouseEnter={() => editorRef.current?.focus()}>
          <Editor
            // [중요] 키 변경으로 컴포넌트 완전 재생성
            key={`${language}-${modelId}`}
            height="100%"
            language={language}
            theme={theme}
            // [중요] 경로 유니크화로 모델 캐싱 방지 + 에디터 구분
            path={`${editorId}_file_${modelId}.${getFileExtension(language)}`}
            // [중요] Controlled Component 방식 사용 (value에 전적으로 의존)
            value={code}
            onChange={(value) => {
              if (!readOnly) {
                const newVal = value || '';
                setCode(newVal);

                if (onCodeChange) {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(() => {
                    onCodeChange(newVal);
                  }, 300);
                }

                const normalizedNew = normalizeCode(newVal);
                const normalizedOrigin = normalizeCode(originCodeRef.current);
                isDirtyRef.current = normalizedNew !== normalizedOrigin;
              }
            }}
            onMount={handleEditorDidMount}
            options={{
              readOnly: readOnly,
              fontFamily: "'D2Coding', 'Fira Code', Consolas, monospace",
              fontSize: 14,
              minimap: { enabled: false },
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* 확인 모달 */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-[350px] rounded-lg bg-background p-6 shadow-lg border">
              <h3 className="text-lg font-semibold">언어 변경</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                기존 작성 내용이 사라집니다.
                <br />
                정말 변경하시겠습니까?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                >
                  취소
                </button>
                <button
                  onClick={confirmLanguageChange}
                  className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-md"
                >
                  변경
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

CCIDEPanel.displayName = 'CCIDEPanel';
