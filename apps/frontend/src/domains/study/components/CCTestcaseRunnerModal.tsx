'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Plus, Trash2, CheckCircle2, XCircle, Play, CheckSquare, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error?: {
        code: string;
        message: string;
    };
}

interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
}

interface TestResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsage: number;
    passed: boolean | null; // null if no expected output to compare against
}

interface ExecutionResponse {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsage: number;
}

interface CCTestcaseRunnerModalProps {
    roomId: number | null;
    studyProblemId: number | null;
    problemTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CCTestcaseRunnerModal({
    roomId,
    studyProblemId,
    problemTitle,
    isOpen,
    onClose,
}: CCTestcaseRunnerModalProps) {
    const [testcases, setTestcases] = useState<TestCase[]>([
        { id: '1', input: '', expectedOutput: '' }
    ]);
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [executingId, setExecutingId] = useState<string | null>(null);

    // Memoized function to fetch testcases
    const fetchTestcases = useCallback(async () => {
        if (!roomId || !studyProblemId) return;
        try {
            const response = await apiFetch<TestCase[]>(`/api/studies/${roomId}/problems/${studyProblemId}/testcases`);
            if (response.success && response.data && response.data.length > 0) {
                setTestcases(response.data);
            } else {
                // Default empty case if none exist
                setTestcases([{ id: '1', input: '', expectedOutput: '' }]);
            }
        } catch (error) {
            console.error('Failed to load testcases:', error);
            // Fallback attempt to localstorage just in case
            const key = `peekle:study:${roomId}:problem:${studyProblemId}:runner_testcases`;
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.length > 0) {
                        setTestcases(parsed);
                    }
                }
            } catch {
                // ignore
            }
        }
    }, [roomId, studyProblemId]);

    // Load from DB when modal opens
    useEffect(() => {
        if (!isOpen || !roomId || !studyProblemId) return;

        fetchTestcases();
        // Clear previous results on open
        setResults({});

        // Listen for WebSocket updates from other users
        const handleTestcasesUpdated = (e: Event) => {
            const customEvent = e as CustomEvent;
            // Only update if it's for the current room
            if (customEvent.detail.studyId === roomId) {
                // Optionally check if user is not the one who saved, but re-fetching is fine.
                fetchTestcases();
            }
        };

        window.addEventListener('study-testcases-updated', handleTestcasesUpdated);

        return () => {
            window.removeEventListener('study-testcases-updated', handleTestcasesUpdated);
        };
    }, [isOpen, roomId, studyProblemId, fetchTestcases]);

    if (!isOpen) return null;

    const handleAddTestcase = () => {
        const newId = Date.now().toString();
        setTestcases(prev => [...prev, { id: newId, input: '', expectedOutput: '' }]);
    };

    const handleSaveTestcase = async () => {
        if (!roomId || !studyProblemId || testcases.length === 0) return;
        try {
            const response = await apiFetch(`/api/studies/${roomId}/problems/${studyProblemId}/testcases`, {
                method: 'POST',
                body: JSON.stringify(testcases)
            });

            if (response.success) {
                toast.success('테스트 케이스가 저장되었습니다.');
            } else {
                toast.error(response.error?.message || '테스트 케이스 저장에 실패했습니다.');
            }
        } catch (error) {
            toast.error('테스트 케이스 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteTestcase = (id: string) => {
        setTestcases(prev => prev.filter(tc => tc.id !== id));
        setResults(prev => {
            const newRes = { ...prev };
            delete newRes[id];
            return newRes;
        });
    };

    const handleUpdateTestcase = (id: string, field: 'input' | 'expectedOutput', value: string) => {
        setTestcases(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
    };

    const runAllTestcases = async () => {
        if (testcases.length === 0) return;

        // 1. Request current code from IDE
        let currentCode = '';
        let currentLang = 'python';

        const handleReceiveCode = (e: Event) => {
            const customEvent = e as CustomEvent;
            currentCode = customEvent.detail.code;
            currentLang = customEvent.detail.language;
        };

        window.addEventListener('receive-ide-code', handleReceiveCode, { once: true });
        window.dispatchEvent(new Event('request-ide-code'));

        // Wait a tiny bit for the synchronous event to process
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!currentCode || !currentCode.trim()) {
            alert('에디터에 작성된 코드가 없습니다.');
            return;
        }

        setIsExecuting(true);
        setResults({});

        const newResults: Record<string, TestResult> = {};

        for (const tc of testcases) {
            setExecutingId(tc.id);
            try {
                // Ensure input ends with newline if required, basic normalize
                let finalInput = tc.input;
                if (finalInput && !finalInput.endsWith('\n')) finalInput += '\n';

                const response = await apiFetch<ExecutionResponse>('/api/executions/run', {
                    method: 'POST',
                    body: JSON.stringify({
                        language: currentLang,
                        code: currentCode,
                        input: finalInput
                    }),
                });

                const data = response.data;
                const stdoutTrimmed = data?.stdout ? data.stdout.trim() : '';
                const expectedTrimmed = tc.expectedOutput ? tc.expectedOutput.trim() : '';

                let passed: boolean | null = null;
                if (expectedTrimmed) {
                    passed = (stdoutTrimmed === expectedTrimmed) && data?.exitCode === 0;
                }

                newResults[tc.id] = {
                    stdout: data?.stdout || '',
                    stderr: data?.stderr || response.error?.message || '',
                    exitCode: data?.exitCode ?? -1,
                    executionTime: data?.executionTime || 0,
                    memoryUsage: data?.memoryUsage || 0,
                    passed
                };
            } catch (error) {
                newResults[tc.id] = {
                    stdout: '',
                    stderr: error instanceof Error ? error.message : 'Execution failed',
                    exitCode: -1,
                    executionTime: 0,
                    memoryUsage: 0,
                    passed: false
                };
            }
        }

        setResults(newResults);
        setExecutingId(null);
        setIsExecuting(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 sm:p-6 cursor-auto" onClick={onClose}>
            <div className="bg-card w-full max-w-4xl h-[85vh] rounded-xl shadow-xl flex flex-col border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">테스트 케이스 전체 실행</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">{problemTitle}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-muted-foreground hover:bg-muted" disabled={isExecuting}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Body - Testcases List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/5 space-y-6">
                    {testcases.map((tc, index) => {
                        const res = results[tc.id];
                        const isRunning = executingId === tc.id;

                        return (
                            <div key={tc.id} className={cn(
                                "rounded-xl border bg-background overflow-hidden transition-all shadow-sm",
                                isRunning ? "border-primary ring-1 ring-primary/50" : "border-border",
                                res?.passed === true ? "border-green-500/50" : res?.passed === false ? "border-destructive/50" : ""
                            )}>
                                {/* Toolbar per testcase */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">Case {index + 1}</span>
                                        {isRunning && <span className="text-xs font-medium text-primary animate-pulse flex items-center gap-1.5"><Play className="h-3 w-3 fill-current" /> 실행 중...</span>}
                                        {res && (
                                            <div className="flex items-center gap-2 ml-2 text-xs font-medium">
                                                {res.passed === true ? (
                                                    <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> 통과</span>
                                                ) : res.passed === false ? (
                                                    <span className="text-destructive flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> 실패</span>
                                                ) : (
                                                    <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 opacity-50" /> 확인 완료</span>
                                                )}
                                                <span className="text-muted-foreground opacity-70 ml-2">{res.executionTime}ms</span>
                                                {res.exitCode !== 0 && <span className="text-destructive opacity-80">(Exit: {res.exitCode})</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={handleSaveTestcase} disabled={isExecuting} title="저장">
                                            <Save className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1" onClick={() => handleDeleteTestcase(tc.id)} disabled={isExecuting || testcases.length <= 1} title="삭제">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* I/O Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                    <div className="flex flex-col p-3">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Input</label>
                                        <textarea
                                            value={tc.input}
                                            onChange={(e) => handleUpdateTestcase(tc.id, 'input', e.target.value)}
                                            className="w-full h-24 bg-muted/10 border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-2 text-sm font-mono resize-y"
                                            placeholder="예: 1 2"
                                            disabled={isExecuting}
                                        />
                                    </div>
                                    <div className="flex flex-col p-3">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Expected Output <span className="lowercase normal-case font-normal text-[10px] ml-1 opacity-70">(선택)</span></label>
                                        <textarea
                                            value={tc.expectedOutput}
                                            onChange={(e) => handleUpdateTestcase(tc.id, 'expectedOutput', e.target.value)}
                                            className="w-full h-24 bg-muted/10 border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-2 text-sm font-mono resize-y"
                                            placeholder="예: 3"
                                            disabled={isExecuting}
                                        />
                                    </div>
                                </div>

                                {/* Results View (if ran) */}
                                {res && (
                                    <div className="p-4 bg-accent/20 border-t border-border border-dashed">
                                        {res.stderr ? (
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-bold text-destructive uppercase tracking-wider">Error / Stderr</span>
                                                <pre className="text-destructive whitespace-pre-wrap word-break bg-destructive/5 p-3 rounded-lg border border-destructive/10 text-xs font-mono">{res.stderr}</pre>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Actual Output</span>
                                                    <pre className={cn("whitespace-pre-wrap word-break p-3 rounded-lg border text-xs font-mono", res.passed === false ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-background border-border text-foreground")}>{res.stdout || <span className="opacity-50 italic">출력 없음</span>}</pre>
                                                </div>
                                                {tc.expectedOutput && res.passed === false && (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Expected</span>
                                                        <pre className="whitespace-pre-wrap word-break bg-green-500/5 p-3 rounded-lg border border-green-500/20 text-green-600 text-xs font-mono">{tc.expectedOutput}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <Button variant="outline" className="w-full border-dashed py-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2" onClick={handleAddTestcase} disabled={isExecuting}>
                        <Plus className="h-4 w-4" /> 새로운 테스트 케이스 추가
                    </Button>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-border bg-card flex justify-between items-center shrink-0">
                    <p className="text-xs text-muted-foreground">
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={isExecuting}>닫기</Button>
                        <Button onClick={runAllTestcases} disabled={isExecuting || testcases.length === 0} className="gap-2 px-6 shadow-sm active:scale-95 transition-all">
                            {isExecuting ? (
                                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {isExecuting ? '실행 중...' : '전체 실행'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
