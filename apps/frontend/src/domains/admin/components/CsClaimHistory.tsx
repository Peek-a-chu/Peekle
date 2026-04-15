'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchAdminStageClaims, CSAdminStageClaimsResponse } from '@/domains/cs/api/csAdminApi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function CsClaimHistory({ stageId }: { stageId: number }) {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<CSAdminStageClaimsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabelMap: Record<string, string> = {
    RECEIVED: '접수',
    REVIEWED: '검토중',
    RESOLVED: '완료',
  };

  useEffect(() => {
    async function loadClaims() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAdminStageClaims(stageId);
        setClaims(response);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '신고 내역을 불러오지 못했습니다.');
        setClaims(null);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, [stageId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        <p className="text-sm">신고 내역을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!claims || claims.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <p className="mb-1">등록된 신고 내역이 없습니다.</p>
        <p className="text-sm">신고가 접수되면 이곳에서 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-muted-foreground">
        총 <span className="font-semibold text-foreground">{claims.totalClaims}</span>건
      </div>
      {claims.items.map((item) => (
        <Card key={item.claimId} className="border-border/60">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">문항 ID: {item.questionId}</div>
              <Badge variant="outline">{statusLabelMap[item.status] ?? item.status}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{item.reason}</p>
            <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
