'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookX,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Inbox,
  Loader2,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  CSMyDomainItem,
  CSWrongProblemItem,
  CSWrongProblemStatus,
  fetchCSWrongProblems,
  fetchMyCSDomains,
} from '@/domains/cs/api/csApi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(isoString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
            active ? 'bg-white/20 text-white' : 'bg-muted-foreground/20 text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function WrongProblemCard({ item }: { item: CSWrongProblemItem }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold">
          #{item.questionId} · 스테이지 {item.stageNo}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {formatRelativeDate(item.lastWrongAt)}
        </span>
      </div>

      <p className="mb-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground">
        Q. {item.prompt}
      </p>

      <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
        <span className="mr-2 font-semibold text-muted-foreground">정답</span>
        <span className="font-bold text-foreground">{item.correctAnswer || '-'}</span>
      </div>
    </div>
  );
}

export default function CSWrongNoteList() {
  const router = useRouter();

  const [myDomains, setMyDomains] = useState<CSMyDomainItem[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<CSWrongProblemStatus>('ACTIVE');
  const [items, setItems] = useState<CSWrongProblemItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);

  useEffect(() => {
    const loadDomains = async () => {
      setIsLoadingDomains(true);
      try {
        const domains = await fetchMyCSDomains();
        setMyDomains(domains);

        const currentDomain = domains.find((domain) => domain.isCurrent) ?? domains[0];
        if (currentDomain) {
          setSelectedDomainId(currentDomain.domain.id);
        }
      } catch (error) {
        console.error('Failed to load my CS domains:', error);
        toast.error('도메인 목록을 불러오지 못했습니다.');
      } finally {
        setIsLoadingDomains(false);
      }
    };

    loadDomains();
  }, []);

  const loadWrongProblems = useCallback(async () => {
    if (selectedDomainId === null) return;

    setIsLoadingItems(true);
    try {
      const response = await fetchCSWrongProblems(selectedDomainId, activeTab, 0, 20);
      setItems(response.content);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Failed to load CS wrong problems:', error);
      toast.error('오답노트를 불러오지 못했습니다.');
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedDomainId, activeTab]);

  useEffect(() => {
    loadWrongProblems();
  }, [loadWrongProblems]);

  const selectedDomainName =
    myDomains.find((domain) => domain.domain.id === selectedDomainId)?.domain.name ?? '도메인 선택';

  const handleStartReview = () => {
    if (!selectedDomainId) {
      toast.error('먼저 도메인을 선택해주세요.');
      return;
    }
    router.push(`/cs/wrong-notes/review?domainId=${selectedDomainId}`);
  };

  if (!isLoadingDomains && myDomains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <BookX className="h-14 w-14 text-muted-foreground/40" />
        <p className="text-lg font-bold text-muted-foreground">학습 중인 도메인이 없습니다</p>
        <p className="text-sm text-muted-foreground/70">CS 탭에서 도메인을 선택한 뒤 다시 시도해주세요.</p>
        <Button className="mt-2" onClick={() => router.push('/cs')}>
          CS 학습으로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <div className="relative">
        <button
          id="wrong-note-domain-filter"
          onClick={() => setDomainDropdownOpen((prev) => !prev)}
          disabled={isLoadingDomains}
          className={cn(
            'w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-left text-sm font-semibold shadow-sm transition-all duration-200',
            'hover:border-primary/50 hover:shadow-md',
            domainDropdownOpen && 'border-primary/60 ring-2 ring-primary/20',
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-foreground">
              {isLoadingDomains ? '도메인 로딩 중...' : selectedDomainName}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                domainDropdownOpen && 'rotate-180',
              )}
            />
          </span>
        </button>

        {domainDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
            {myDomains.map((domainItem) => (
              <button
                key={domainItem.domain.id}
                onClick={() => {
                  setSelectedDomainId(domainItem.domain.id);
                  setDomainDropdownOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted',
                  selectedDomainId === domainItem.domain.id && 'bg-primary/5 font-bold text-primary',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="truncate">{domainItem.domain.name}</span>
                  {domainItem.isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      학습 중
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'ACTIVE'}
            onClick={() => setActiveTab('ACTIVE')}
            icon={<BookX className="h-4 w-4" />}
            label="복습할 문제"
            count={activeTab === 'ACTIVE' ? totalElements : undefined}
          />
          <TabButton
            active={activeTab === 'CLEARED'}
            onClick={() => setActiveTab('CLEARED')}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="복습 완료"
            count={activeTab === 'CLEARED' ? totalElements : undefined}
          />
        </div>

        {activeTab === 'ACTIVE' && (
          <Button
            onClick={handleStartReview}
            disabled={isLoadingItems || totalElements === 0}
            className="h-10 gap-1.5 rounded-xl font-semibold"
          >
            <Play className="h-4 w-4 fill-current" />
            복습하기
          </Button>
        )}
      </div>

      {isLoadingItems ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">오답 목록을 불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState status={activeTab} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <WrongProblemCard key={item.questionId} item={item} />
          ))}

          {totalElements > items.length && (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              {items.length} / {totalElements}개 표시 중
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ status }: { status: CSWrongProblemStatus }) {
  if (status === 'ACTIVE') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <p className="text-lg font-bold text-foreground">복습할 오답이 없습니다.</p>
        <p className="text-sm text-muted-foreground">새로운 문제를 풀고 오답이 생기면 이곳에서 복습할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <p className="text-lg font-bold text-muted-foreground">복습 완료 문제가 없습니다.</p>
      <p className="text-sm text-muted-foreground/70">복습을 완료하면 이 탭에서 확인할 수 있습니다.</p>
    </div>
  );
}
