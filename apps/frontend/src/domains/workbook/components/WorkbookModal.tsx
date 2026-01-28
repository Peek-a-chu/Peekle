'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, X, GripVertical, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { WorkbookProblemItem, BojProblem, Workbook, WorkbookProblem } from '../types';
import { mockAllBojProblems } from '../mocks/mockData';

interface WorkbookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  workbook?: Workbook | null;
  problems?: WorkbookProblem[];
  onSubmit: (data: { title: string; description: string; problems: WorkbookProblemItem[] }) => void;
}

interface SortableProblemItemProps {
  item: WorkbookProblemItem;
  index: number;
  onRemove: (id: string) => void;
}

function SortableProblemItem({ item, index, onRemove }: SortableProblemItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-md group',
        isDragging && 'opacity-50 shadow-lg ring-1 ring-pink-500/30'
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
      <span className="font-medium text-pink-500 text-sm w-14">{item.number}</span>
      <span className="flex-1 text-sm truncate">{item.title}</span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function WorkbookModal({
  open,
  onOpenChange,
  mode,
  workbook,
  problems = [],
  onSubmit,
}: WorkbookModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problemList, setProblemList] = useState<WorkbookProblemItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && workbook) {
        setTitle(workbook.title);
        setDescription(workbook.description);
        setProblemList(
          problems.map((p) => ({
            id: `problem-${p.id}`,
            number: p.number,
            title: p.title,
          }))
        );
      } else {
        setTitle('');
        setDescription('');
        setProblemList([]);
      }
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  }, [open, mode, workbook, problems]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const addedNumbers = new Set(problemList.map((p) => p.number));

    return mockAllBojProblems
      .filter((p) => {
        if (addedNumbers.has(p.number)) return false;
        return (
          p.number.toString().includes(query) ||
          p.title.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [searchQuery, problemList]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProblemList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddProblem = (problem: BojProblem) => {
    setProblemList((prev) => [
      ...prev,
      {
        id: `problem-${problem.number}-${Date.now()}`,
        number: problem.number,
        title: problem.title,
      },
    ]);
    setSearchQuery('');
    setIsDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveProblem = (id: string) => {
    setProblemList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, description, problems: problemList });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] h-[560px] flex flex-col p-0 gap-0 overflow-visible">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>
            {mode === 'create' ? '새 문제집 만들기' : '문제집 수정'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* 좌측 패널 */}
          <div className="w-[320px] border-r flex flex-col shrink-0">
            {/* 제목 & 설명 */}
            <div className="p-5 space-y-4 border-b">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">제목</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문제집 제목"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">설명 (선택)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="문제집 설명"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>

            {/* 검색 영역 */}
            <div className="p-5 flex-1 overflow-visible">
              <label className="text-sm font-medium block mb-2">문제 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => searchQuery && setIsDropdownOpen(true)}
                  placeholder="번호 또는 제목 검색"
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* 드롭다운 */}
                {isDropdownOpen && searchQuery && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-[100] top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-xl"
                  >
                    {searchResults.length > 0 ? (
                      <div className="py-1 max-h-[240px] overflow-y-auto">
                        {searchResults.map((problem) => (
                          <button
                            key={problem.number}
                            type="button"
                            onClick={() => handleAddProblem(problem)}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 text-sm transition-colors"
                          >
                            <span className="font-medium text-pink-500 w-12">{problem.number}</span>
                            <span className="truncate flex-1">{problem.title}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                클릭하면 우측 목록에 추가됩니다
              </p>
            </div>
          </div>

          {/* 우측 패널 - 문제 목록 */}
          <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
            <div className="px-5 py-3 border-b bg-background flex items-center justify-between shrink-0">
              <span className="text-sm font-medium">문제 목록</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {problemList.length}개
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {problemList.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">추가된 문제가 없습니다</p>
                    <p className="text-xs mt-1">좌측에서 문제를 검색해 추가하세요</p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={problemList.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {problemList.map((item, index) => (
                        <SortableProblemItem
                          key={item.id}
                          item={item}
                          index={index}
                          onRemove={handleRemoveProblem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            {mode === 'create' ? '만들기' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
