'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, Plus, Loader2, CheckCircle2, BookOpen, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CSDomain,
  CSMyDomainItem,
  fetchMyCSDomains,
  changeCurrentCSDomain,
} from '@/domains/cs/api/csApi';

interface CSTopBarProps {
  /** 현재 활성 도메인 */
  currentDomain: CSDomain;
  /** 도메인이 변경된 후 부모가 데이터를 새로 불러오기 위한 콜백 */
  onDomainChanged: () => void;
  /** 도메인 추가 화면으로 이동 요청 시 콜백 */
  onRequestAddDomain: () => void;
  /** 오답노트 화면으로 이동 요청 시 콜백 */
  onRequestWrongNote: () => void;
}

export default function CSTopBar({
  currentDomain,
  onDomainChanged,
  onRequestAddDomain,
  onRequestWrongNote,
}: CSTopBarProps) {
  const [open, setOpen] = useState(false);
  const [myDomains, setMyDomains] = useState<CSMyDomainItem[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [changingId, setChangingId] = useState<number | null>(null);

  /* ------------------------------------------------------------------ */
  /* 내 도메인 목록 로드 (Popover 열릴 때)                                 */
  /* ------------------------------------------------------------------ */
  const loadMyDomains = useCallback(async () => {
    setLoadingDomains(true);
    try {
      console.log('[DEBUG] CSTopBar: fetchMyCSDomains 호출');
      const data = await fetchMyCSDomains();
      setMyDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[DEBUG] CSTopBar: fetchMyCSDomains 실패', err);
      toast.error('도메인 목록을 불러오지 못했습니다.');
      setMyDomains([]);
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMyDomains();
    }
  }, [open, loadMyDomains]);

  /* ------------------------------------------------------------------ */
  /* 도메인 변경                                                           */
  /* ------------------------------------------------------------------ */
  const handleChangeDomain = async (item: CSMyDomainItem) => {
    if (item.domain.id === currentDomain.id) {
      setOpen(false);
      return;
    }

    setChangingId(item.domain.id);
    try {
      console.log(`[DEBUG] CSTopBar: changeCurrentCSDomain(${item.domain.id}) 호출`);
      await changeCurrentCSDomain(item.domain.id);
      toast.success(`도메인이 "${item.domain.name}"(으)로 변경되었습니다.`);
      setOpen(false);
      onDomainChanged();
    } catch (err) {
      console.error('[DEBUG] CSTopBar: changeCurrentCSDomain 실패', err);
      toast.error('도메인 변경에 실패했습니다.');
    } finally {
      setChangingId(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 오답 보기                                                           */
  /* ------------------------------------------------------------------ */
  const handleWrongNote = () => {
    console.log('[DEBUG] CSTopBar: 오답 보기 버튼 클릭');
    onRequestWrongNote();
  };

  /* ------------------------------------------------------------------ */
  /* 렌더                                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <header className="w-full flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
      {/* ── 좌측: 현재 도메인 + 변경 Popover ── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id="cs-topbar-domain-trigger"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors group"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
              <BookOpen className="w-3 h-3" />
            </span>
            <span className="text-sm font-semibold text-primary leading-none">
              {currentDomain.name}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-primary/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-64 p-2 rounded-2xl shadow-xl border border-border/60"
        >
          {/* 타이틀 */}
          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            내 도메인
          </p>

          {/* 목록 */}
          {loadingDomains ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : myDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              등록된 도메인이 없습니다.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {myDomains.map((item) => {
                const isActive = item.domain.id === currentDomain.id;
                const isChanging = changingId === item.domain.id;

                return (
                  <li key={item.domain.id}>
                    <button
                      id={`cs-topbar-domain-item-${item.domain.id}`}
                      onClick={() => handleChangeDomain(item)}
                      disabled={!!changingId}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-muted text-foreground'
                        }
                        disabled:opacity-60 disabled:cursor-not-allowed
                      `}
                    >
                      <span className="truncate">{item.domain.name}</span>

                      {isChanging ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                      ) : isActive ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 구분선 + 도메인 추가 버튼 */}
          <div className="mt-1.5 pt-1.5 border-t border-border/50">
            <button
              id="cs-topbar-add-domain"
              onClick={() => {
                console.log('[DEBUG] CSTopBar: 도메인 추가 버튼 클릭');
                setOpen(false);
                onRequestAddDomain();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              도메인 추가
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* ── 우측: 오답 보기 버튼 ── */}
      <Button
        id="cs-topbar-wrong-note"
        variant="outline"
        size="sm"
        onClick={handleWrongNote}
        className="gap-1.5 rounded-full border-border/60 text-muted-foreground"
      >
        <NotebookPen className="w-4 h-4" />
        오답 보기
      </Button>
    </header>
  );
}
