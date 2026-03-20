'use client';

import { useState, useEffect } from 'react';
import {
    Dialog as ShadcnDialog,
    DialogContent as ShadcnDialogContent,
    DialogHeader as ShadcnDialogHeader,
    DialogTitle as ShadcnDialogTitle,
    DialogDescription as ShadcnDialogDescription,
    DialogFooter as ShadcnDialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import {
    createWorkbook,
    addProblemToWorkbook,
    getWorkbooks,
    WorkbookListResponse
} from '../api/workbookApi';
import { searchBojProblems, getProblemIdByExternalId } from '../api/problemApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface AddToWorkbookModalProps {
    isOpen: boolean;
    onClose: () => void;
    problemBojId: string; // e.g., "#1149"
    problemTitle: string;
}

export function AddToWorkbookModal({
    isOpen,
    onClose,
    problemBojId,
    problemTitle,
}: AddToWorkbookModalProps) {
    const isMobile = useIsMobile();
    const [workbooks, setWorkbooks] = useState<WorkbookListResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState<number | null>(null);
    const [internalProblemId, setInternalProblemId] = useState<number | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedWorkbookId, setSelectedWorkbookId] = useState<number | null>(null);

    // 1. 문제 내부 ID 및 내 문제집 목록 조회
    useEffect(() => {
        if (isOpen) {
            void loadInitialData();
        } else {
            // Reset state on close
            setSelectedWorkbookId(null);
            setIsCreating(false);
            setNewTitle('');
            setSearchKeyword('');
        }
    }, [isOpen, problemBojId, problemTitle]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            // 내 문제집 목록 조회
            const workbookData = await getWorkbooks('MY', undefined, 'LATEST', 0, 50);
            setWorkbooks(workbookData.content);

            // 백준 번호로 내부 ID 찾기 (Direct ID lookup)
            const cleanId = problemBojId.replace('#', '');
            try {
                const pId = await getProblemIdByExternalId(cleanId);
                setInternalProblemId(pId);
            } catch (err) {
                const searchResults = await searchBojProblems(cleanId);
                const found = searchResults.find(p => p.externalId === cleanId);
                if (found) {
                    setInternalProblemId(found.id);
                } else if (searchResults.length > 0) {
                    setInternalProblemId(searchResults[0].id);
                } else {
                    toast.error('문제를 데이터베이스에서 찾을 수 없습니다.');
                }
            }
        } catch (error) {
            toast.error('목록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. 문제집에 문제 추가
    const handleAddToWorkbook = async (workbookId: number) => {
        if (!internalProblemId) {
            toast.error('문제 정보가 올바르지 않습니다.');
            return;
        }
        setIsAdding(workbookId);
        try {
            await addProblemToWorkbook(workbookId, internalProblemId);
            toast.success('문제집에 성공적으로 추가되었습니다.');
            onClose();
        } catch (error: any) {
            const message = error.message || '문제 추가에 실패했습니다.';
            if (message.includes('이미')) { // Custom error handling for duplicate
                toast.info(message);
            } else {
                toast.error(message);
            }
        } finally {
            setIsAdding(null);
        }
    };

    // 3. 새 문제집 생성
    const handleCreateAndAdd = async () => {
        if (!newTitle.trim()) return;
        setIsLoading(true);
        try {
            if (!internalProblemId) {
                toast.error('문제 정보가 올바르지 않아 추가할 수 없습니다.');
                return;
            }

            await createWorkbook({
                title: newTitle,
                description: '',
                problemIds: [internalProblemId]
            });
            toast.success('새 문제집을 만들고 문제를 추가했습니다.');
            onClose();
        } catch (error) {
            toast.error('문제집 생성에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredWorkbooks = workbooks.filter(w =>
        w.title.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    return (
        <ShadcnDialog open={isOpen} onOpenChange={onClose}>
            <ShadcnDialogContent
                className={cn(
                    'bg-card border-border shadow-2xl flex flex-col gap-0',
                    isMobile
                        ? 'w-[calc(100vw-1rem)] max-w-none h-[calc(100vh-1.5rem)] max-h-[calc(100vh-1.5rem)] rounded-2xl top-3 translate-y-0 p-4 overflow-hidden'
                        : 'sm:max-w-[420px] rounded-3xl p-6 max-h-[85vh]'
                )}
            >

                {/* 1. Header Area */}
                <ShadcnDialogHeader className={cn('space-y-1.5 border-b shrink-0', isMobile ? 'pb-3' : 'pb-4')}>
                    <ShadcnDialogTitle className={cn('font-bold flex items-center gap-2', isMobile ? 'text-lg' : 'text-xl')}>
                        문제집에 추가
                    </ShadcnDialogTitle>
                    <ShadcnDialogDescription className="text-sm font-medium">
                        <span className="text-muted-foreground/70 font-normal">선택한 문제:</span>{' '}
                        <span className="text-muted-foreground">{problemBojId} {problemTitle}</span>
                    </ShadcnDialogDescription>
                </ShadcnDialogHeader>

                {/* 2. Body Area */}
                <div className={cn('flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent px-1', isMobile ? 'min-h-0' : 'min-h-[250px]')}>
                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                            placeholder="내 문제집 검색..."
                            value={searchKeyword}
                            onChange={(e) => {
                                setSearchKeyword(e.target.value);
                            }}
                            className="pl-9 h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl"
                        />
                    </div>

                    {/* Workbook List */}
                    <div className="space-y-2">
                        {isLoading && workbooks.length === 0 ? (
                            <div className="py-10 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                            </div>
                        ) : filteredWorkbooks.length > 0 ? (
                            filteredWorkbooks.map((workbook) => (
                                <button
                                    key={workbook.id}
                                    onClick={() => {
                                        setSelectedWorkbookId(workbook.id);
                                    }}
                                    disabled={isAdding !== null}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group",
                                        selectedWorkbookId === workbook.id
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                            : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
                                    )}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className={cn(
                                            "text-[15px] transition-colors line-clamp-1",
                                            selectedWorkbookId === workbook.id ? "text-primary font-bold" : "text-foreground font-semibold"
                                        )}>
                                            {workbook.title}
                                        </span>
                                        <span className="text-[13px] text-muted-foreground">
                                            {workbook.problemCount}개의 문제
                                        </span>
                                    </div>
                                    {selectedWorkbookId === workbook.id && (
                                        <div className="text-primary bg-primary/10 p-1 rounded-full">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                                <p className="text-sm text-muted-foreground">문제집이 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* Inline Create Form */}
                    <div className="pt-2">
                        {isCreating ? (
                            <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border animate-in fade-in slide-in-from-top-2">
                                <Input
                                    placeholder="새 문제집 이름"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateAndAdd();
                                        if (e.key === 'Escape') setIsCreating(false);
                                    }}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewTitle('');
                                        }}
                                        className="h-8 px-3 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg"
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={!newTitle.trim() || isLoading}
                                        onClick={handleCreateAndAdd}
                                        className="h-8 px-4 text-xs font-bold rounded-lg"
                                    >
                                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                                        만들고 추가하기
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsCreating(true);
                                    setSelectedWorkbookId(null);
                                }}
                                className="w-full flex items-center justify-center gap-2 p-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl transition-colors border-2 border-transparent hover:border-border border-dashed"
                                disabled={isAdding !== null}
                            >
                                <Plus className="w-4 h-4" />
                                새 문제집 만들기
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Footer Area */}
                <ShadcnDialogFooter
                    className={cn(
                        'border-t shrink-0 flex items-center gap-2 mt-0',
                        isMobile
                            ? 'pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-row justify-between'
                            : 'pt-4 flex-row justify-between sm:justify-between',
                    )}
                >
                    <Button
                        variant="ghost"
                        onClick={() => {
                            onClose();
                        }}
                        className={cn(
                            'text-muted-foreground hover:text-foreground rounded-xl border border-transparent hover:border-border h-11',
                            isMobile ? 'flex-1' : 'flex-1 sm:flex-none',
                        )}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={() => {
                            if (selectedWorkbookId) {
                                handleAddToWorkbook(selectedWorkbookId);
                            }
                        }}
                        disabled={!selectedWorkbookId || isAdding !== null || isCreating || isLoading}
                        className={cn('font-bold rounded-xl h-11', isMobile ? 'flex-1' : 'px-8 flex-1 sm:flex-none')}
                    >
                        {isAdding !== null ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        추가
                    </Button>
                </ShadcnDialogFooter>
            </ShadcnDialogContent>
        </ShadcnDialog>
    );
}
