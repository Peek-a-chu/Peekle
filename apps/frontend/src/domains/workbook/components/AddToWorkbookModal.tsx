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
import { Label } from '@/components/ui/label';
import { Plus, Check, Loader2, FolderPlus, Search } from 'lucide-react';
import {
    createWorkbook,
    addProblemToWorkbook,
    getWorkbooks,
    WorkbookListResponse
} from '../api/workbookApi';
import { searchBojProblems, getProblemIdByExternalId, BojProblemResponse } from '../api/problemApi';
import { toast } from 'sonner';

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
    const [workbooks, setWorkbooks] = useState<WorkbookListResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState<number | null>(null);
    const [internalProblemId, setInternalProblemId] = useState<number | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    // 1. 문제 내부 ID 및 내 문제집 목록 조회
    useEffect(() => {
        if (isOpen) {
            void loadInitialData();
        }
    }, [isOpen, problemBojId]);

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
                console.warn('Direct ID lookup failed, falling back to search:', err);
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
            console.error('Failed to load data:', error);
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
            console.error('Failed to add problem:', error);
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

    // 3. 새 문제집 생성하고 바로 문제 추가
    const handleCreateAndAdd = async () => {
        if (!newTitle.trim() || !internalProblemId) return;

        setIsLoading(true);
        try {
            await createWorkbook({
                title: newTitle,
                description: '',
                problemIds: [internalProblemId]
            });
            toast.success('새 문제집을 만들고 문제를 추가했습니다.');
            onClose();
        } catch (error) {
            console.error('Failed to create workbook:', error);
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
            <ShadcnDialogContent className="sm:max-w-[420px] bg-card border-border shadow-2xl rounded-3xl p-6">
                <ShadcnDialogHeader className="space-y-3 pb-4">
                    <ShadcnDialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        문제집에 추가
                    </ShadcnDialogTitle>
                    <ShadcnDialogDescription className="text-sm font-medium">
                        <span className="text-muted-foreground">선택한 문제:</span>{' '}
                        <span className="text-foreground">{problemBojId} {problemTitle}</span>
                    </ShadcnDialogDescription>
                </ShadcnDialogHeader>

                <div className="space-y-4 py-2">
                    {isCreating ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <Label htmlFor="new-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    새 문제집 이름
                                </Label>
                                <Input
                                    id="new-title"
                                    placeholder="예: 실버 DP 정복하기"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="rounded-xl border-border bg-muted/30 focus:ring-primary/20"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 rounded-xl font-bold"
                                    disabled={!newTitle.trim() || isLoading}
                                    onClick={handleCreateAndAdd}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '생성 및 추가'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl border-border font-bold"
                                    onClick={() => setIsCreating(false)}
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 검색창 */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="내 문제집 검색..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    className="pl-10 rounded-xl border-border bg-muted/30 focus:ring-primary/20 h-10 text-sm"
                                />
                            </div>

                            {/* 목록 영역 */}
                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                {isLoading ? (
                                    <div className="py-10 flex justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                    </div>
                                ) : filteredWorkbooks.length > 0 ? (
                                    filteredWorkbooks.map((workbook) => (
                                        <button
                                            key={workbook.id}
                                            onClick={() => handleAddToWorkbook(workbook.id)}
                                            disabled={isAdding !== null}
                                            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-primary/5 hover:border-primary/20 transition-all group text-left"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-[15px] group-hover:text-primary transition-colors line-clamp-1">
                                                    {workbook.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {workbook.problemCount}개의 문제
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                {isAdding === workbook.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center space-y-2">
                                        <p className="text-sm text-muted-foreground">문제집이 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl border-dashed border-2 border-border hover:border-primary/50 hover:bg-primary/5 h-12 gap-2 font-bold"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    새 문제집 만들기
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                {!isCreating && (
                    <ShadcnDialogFooter className="pt-4">
                        <Button variant="ghost" onClick={onClose} className="w-full rounded-xl text-muted-foreground hover:text-foreground">
                            닫기
                        </Button>
                    </ShadcnDialogFooter>
                )}
            </ShadcnDialogContent>
        </ShadcnDialog>
    );
}
