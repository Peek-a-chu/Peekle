'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  fetchAdminDomains,
  createAdminDomain,
  renameAdminDomain,
  deleteAdminDomain,
  fetchAdminTracks,
  createAdminTrack,
  renameAdminTrack,
  CSAdminTrack
} from '@/domains/cs/api/csAdminApi';
import { CSDomain } from '@/domains/cs/api/csApi';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Plus, RefreshCw, ChevronRight, Pencil } from 'lucide-react';

interface Props {
  selectedDomainId: number | null;
  onSelectDomain: (id: number | null) => void;
  selectedTrack: CSAdminTrack | null;
  onSelectTrack: (track: CSAdminTrack | null) => void;
  selectedStageId: number | null;
  onSelectStage: (id: number | null) => void;
}

export default function CsDomainManager({
  selectedDomainId, onSelectDomain,
  selectedTrack, onSelectTrack,
  selectedStageId, onSelectStage
}: Props) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CSDomain[]>([]);
  const [tracks, setTracks] = useState<CSAdminTrack[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const loadDomains = async () => {
    setLoadingDomains(true);
    try {
      const data = await fetchAdminDomains();
      setDomains(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadTracks = async (domainId: number) => {
    setLoadingTracks(true);
    try {
      const data = await fetchAdminTracks(domainId);
      setTracks(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    } finally {
      setLoadingTracks(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomainId) {
      loadTracks(selectedDomainId);
    } else {
      setTracks([]);
    }
  }, [selectedDomainId]);

  const handleCreateDomain = async () => {
    const name = prompt('새 도메인 이름을 입력하세요');
    if (!name?.trim()) return;
    try {
      const newDomain = await createAdminDomain(name.trim());
      setDomains([...domains, newDomain]);
      toast({ title: '도메인 생성 성공' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  const handleDeleteDomain = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('정말 삭제하시겠습니까? 관련 데이터가 모두 삭제될 수 있습니다.')) return;
    try {
      await deleteAdminDomain(id);
      setDomains(domains.filter(d => d.id !== id));
      if (selectedDomainId === id) {
        onSelectDomain(null);
        onSelectTrack(null);
        onSelectStage(null);
      }
      toast({ title: '도메인 삭제 성공' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  const handleRenameDomain = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = domains.find((d) => d.id === id);
    if (!target) return;

    const name = prompt('도메인 새 이름을 입력하세요', target.name);
    if (!name?.trim() || name.trim() === target.name) return;

    try {
      const updated = await renameAdminDomain(id, name.trim());
      setDomains(domains.map((d) => (d.id === id ? updated : d)));
      toast({ title: '도메인 이름 변경 성공' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  const handleCreateTrack = async () => {
    if (!selectedDomainId) return;
    const name = prompt('새 트랙 이름을 입력하세요 (생성 시 10개 스테이지 자동생성)');
    if (!name?.trim()) return;
    try {
      const newTrack = await createAdminTrack(selectedDomainId, name.trim());
      setTracks([...tracks, newTrack]);
      toast({ title: '트랙 생성 성공 (스테이지 10개 포함)' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  const handleRenameTrack = async (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = tracks.find((track) => track.trackId === trackId);
    if (!target) return;

    const name = prompt('트랙 새 이름을 입력하세요', target.name);
    if (!name?.trim() || name.trim() === target.name) return;

    try {
      const updated = await renameAdminTrack(trackId, name.trim());
      setTracks(tracks.map((track) => (track.trackId === trackId ? updated : track)));
      if (selectedTrack?.trackId === trackId) {
        onSelectTrack(updated);
      }
      toast({ title: '트랙 이름 변경 성공' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '오류', description: err.message });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md">도메인</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={loadDomains} disabled={loadingDomains}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCreateDomain}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y max-h-60 overflow-y-auto">
            {domains.map(d => (
              <li
                key={d.id}
                className={`p-3 flex justify-between cursor-pointer hover:bg-muted/50 ${selectedDomainId === d.id ? 'bg-muted' : ''}`}
                onClick={() => {
                  onSelectDomain(d.id);
                  onSelectTrack(null);
                  onSelectStage(null);
                }}
              >
                <span>{d.name}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleRenameDomain(d.id, e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => handleDeleteDomain(d.id, e)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
            {domains.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">도메인이 없습니다.</li>}
          </ul>
        </CardContent>
      </Card>

      {selectedDomainId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md">트랙</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleCreateTrack}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y max-h-60 overflow-y-auto">
              {tracks.map(t => (
                <li key={t.trackId}>
                  <div 
                    className={`p-3 flex justify-between cursor-pointer hover:bg-muted/50 font-medium ${selectedTrack?.trackId === t.trackId ? 'bg-muted' : ''}`}
                    onClick={() => {
                      onSelectTrack(selectedTrack?.trackId === t.trackId ? null : t);
                      onSelectStage(null);
                    }}
                  >
                    <span>{t.trackNo}. {t.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleRenameTrack(t.trackId, e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ChevronRight className={`h-4 w-4 transition-transform ${selectedTrack?.trackId === t.trackId ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  {selectedTrack?.trackId === t.trackId && (
                    <ul className="bg-muted/30 pl-6 pb-2">
                      {t.stageIds?.map((stageId, i) => (
                        <li 
                          key={stageId}
                          className={`p-2 text-sm cursor-pointer hover:text-primary ${selectedStageId === stageId ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                          onClick={() => onSelectStage(stageId)}
                        >
                          스테이지 {i + 1}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {tracks.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">트랙이 없습니다.</li>}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
