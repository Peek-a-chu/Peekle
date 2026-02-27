import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Plus, Trash2, Settings2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import type { ExecutionResponse } from '@/domains/study/hooks/useExecution';

interface TestCase {
    id: string;
    name: string;
    input: string;
}

interface CCConsolePanelProps {
    roomId: number | null;
    problemId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onExecute: (input: string) => void;
    isExecuting: boolean;
    executionResult: ExecutionResponse | null;
}

export function CCConsolePanel({
    roomId,
    problemId,
    isOpen,
    onClose,
    onExecute,
    isExecuting,
    executionResult,
}: CCConsolePanelProps) {
    const [mode, setMode] = useState<'input' | 'output'>('input');
    const [testCases, setTestCases] = useState<TestCase[]>([
        { id: 'default', name: '테스트 1', input: '' }
    ]);
    const [activeTestCaseId, setActiveTestCaseId] = useState<string>('default');
    const [autoNewline, setAutoNewline] = useState<boolean>(true);

    // Load from LocalStorage
    useEffect(() => {
        if (!roomId || !problemId) return;
        const key = `peekle:study:${roomId}:problem:${problemId}:testcases`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.testCases && parsed.testCases.length > 0) {
                    setTestCases(parsed.testCases);
                    setActiveTestCaseId(parsed.activeTestCaseId || parsed.testCases[0].id);
                    if (parsed.autoNewline !== undefined) {
                        setAutoNewline(parsed.autoNewline);
                    }
                }
            } else {
                setTestCases([{ id: 'default', name: '테스트 1', input: '' }]);
                setActiveTestCaseId('default');
                setAutoNewline(true);
            }
        } catch {
            // ignore
        }
    }, [roomId, problemId]);

    // Save to LocalStorage
    useEffect(() => {
        if (!roomId || !problemId) return;
        const key = `peekle:study:${roomId}:problem:${problemId}:testcases`;
        try {
            localStorage.setItem(key, JSON.stringify({ testCases, activeTestCaseId, autoNewline }));
        } catch {
            // ignore
        }
    }, [testCases, activeTestCaseId, autoNewline, roomId, problemId]);

    // Switch to Output mode smoothly when executing begins or result arrives
    useEffect(() => {
        if (isExecuting || executionResult) {
            setMode('output');
        }
    }, [isExecuting, executionResult]);

    const currentTestCase = testCases.find(tc => tc.id === activeTestCaseId) || testCases[0];

    // Listen for Upper Execution triggers securely
    useEffect(() => {
        const handler = () => {
            let finalInput = currentTestCase?.input || '';
            if (autoNewline && finalInput && !finalInput.endsWith('\n')) {
                finalInput += '\n';
            }
            onExecute(finalInput);
        };
        window.addEventListener('study-ide-execute-trigger', handler);
        return () => window.removeEventListener('study-ide-execute-trigger', handler);
    }, [currentTestCase, autoNewline, onExecute]);

    // Component stays mounted via wrapper styling to catch execution events reliably

    const handleInputChange = (val: string) => {
        setTestCases(prev => prev.map(tc => tc.id === activeTestCaseId ? { ...tc, input: val } : tc));
    };

    const handleAddTestCase = () => {
        const newId = Date.now().toString();
        const newName = `테스트 ${testCases.length + 1}`;
        setTestCases(prev => [...prev, { id: newId, name: newName, input: '' }]);
        setActiveTestCaseId(newId);
    };

    const handleDeleteTestCase = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (testCases.length <= 1) return;
        setTestCases(prev => prev.filter(tc => tc.id !== id));
        if (activeTestCaseId === id) {
            const idx = testCases.findIndex(tc => tc.id === id);
            const newActive = idx > 0 ? testCases[idx - 1].id : testCases[1].id;
            setActiveTestCaseId(newActive);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative w-full overflow-hidden">
            {/* Header - Test Case Chips */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 h-11 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                    {testCases.map((tc) => (
                        <div key={tc.id} className="relative group">
                            <button
                                onClick={() => setActiveTestCaseId(tc.id)}
                                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 border whitespace-nowrap",
                                    activeTestCaseId === tc.id
                                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                                        : "bg-transparent border-transparent hover:bg-muted text-muted-foreground"
                                )}
                            >
                                {tc.name}
                            </button>
                            {testCases.length > 1 && (
                                <button
                                    onClick={(e) => handleDeleteTestCase(tc.id, e)}
                                    className={cn(
                                        "absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                        activeTestCaseId === tc.id && "opacity-100 scale-95 hover:scale-105"
                                    )}
                                >
                                    <X className="h-2 w-2" strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80 ml-1 shrink-0" onClick={handleAddTestCase}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-muted/80"
                        onClick={() => setAutoNewline(!autoNewline)}
                        title={autoNewline ? "자동 개행 켜짐 (끄기)" : "자동 개행 꺼짐 (켜기)"}
                    >
                        <Settings2 className={cn("h-4 w-4 transition-colors", autoNewline && "text-primary")} />
                    </Button>
                    <div className="w-px h-4 bg-border/60 mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Body swapped by Mode */}
            <div className="flex-1 min-h-0 relative flex flex-col bg-background">
                {mode === 'input' ? (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            className="flex-1 w-full bg-transparent border-none p-4 text-sm font-mono resize-none focus:outline-none focus:ring-0 leading-relaxed disabled:opacity-50 text-foreground placeholder:text-muted-foreground/50"
                            placeholder="이곳에 테스트 케이스 입력값을 작성하세요..."
                            value={currentTestCase.input}
                            onChange={(e) => handleInputChange(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-muted/10">
                        {/* Input preview row */}
                        <div
                            className="flex items-center justify-between px-4 py-2.5 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-border/50 shrink-0 cursor-pointer hover:bg-accent/40 transition-colors z-10"
                            onClick={() => setMode('input')}
                        >
                            <div className="flex items-center gap-3 min-w-0 pr-4">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 bg-muted/50 px-2 py-0.5 rounded-sm">Input</span>
                                <span className="text-sm font-mono truncate text-muted-foreground">
                                    {currentTestCase.input.replace(/\n/g, ' ↵ ') || '입력값 없음'}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 px-2.5 text-xs text-muted-foreground font-medium hover:text-foreground hover:bg-background/80 shrink-0 border border-transparent hover:border-border">
                                <Edit2 className="h-3 w-3 mr-1.5" />입력 편집
                            </Button>
                        </div>

                        {/* Output area */}
                        <div className="flex-1 min-h-0 p-4 overflow-auto font-mono text-sm leading-relaxed">
                            {isExecuting ? (
                                <div className="flex items-center justify-center h-full flex-col gap-4 text-muted-foreground">
                                    <div className="h-6 w-6 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                                    <span className="font-semibold text-sm tracking-wide animate-pulse text-primary/80">실행 및 평가 중...</span>
                                </div>
                            ) : executionResult ? (
                                <div className="flex flex-col gap-4 h-full">
                                    {executionResult.stdout && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest pl-1">Output</span>
                                            <pre className="text-foreground whitespace-pre-wrap word-break px-1">{executionResult.stdout}</pre>
                                        </div>
                                    )}
                                    {executionResult.stderr && (
                                        <div className="flex flex-col gap-1.5 mt-2">
                                            <span className="text-[10px] font-bold text-destructive/70 uppercase tracking-widest pl-1">Error / Stats</span>
                                            <pre className="text-destructive whitespace-pre-wrap word-break bg-destructive/5 p-3.5 rounded-lg border border-destructive/10 text-[13px]">{executionResult.stderr}</pre>
                                        </div>
                                    )}
                                    {!executionResult.stdout && !executionResult.stderr && (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="bg-muted/30 px-4 py-2 rounded-full text-muted-foreground/70 text-xs font-semibold tracking-wide">
                                                출력 내용이 없습니다
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-auto pt-5 flex items-center gap-5 text-xs font-semibold shrink-0 opacity-80 border-t border-border/40">
                                        <div className="flex items-center gap-1.5">
                                            {executionResult.exitCode === 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                                            <span className={executionResult.exitCode === 0 ? "text-green-500" : "text-destructive"}>Exit Code: {executionResult.exitCode}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <span>소요 시간: {executionResult.executionTime} ms</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground/50">
                                    <span className="bg-muted/20 px-4 py-2 rounded-lg italic text-sm">상단의 실행(▶) 버튼을 눌러보세요</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
