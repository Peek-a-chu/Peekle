'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CSDomain } from '@/domains/cs/api/csApi';
import {
  CSAdminClaimOverviewPageResponse,
  CSAdminClaimOverviewQuery,
  CSAdminClaimStatus,
  CSAdminClaimType,
  CSAdminTrack,
  fetchAdminClaimsOverview,
  fetchAdminDomains,
  fetchAdminTracks,
  updateAdminClaimStatus,
} from '@/domains/cs/api/csAdminApi';

const PAGE_SIZE = 20;

const STATUS_LABEL_MAP: Record<CSAdminClaimStatus, string> = {
  RECEIVED: '접수',
  REVIEWED: '검토중',
  RESOLVED: '완료',
};

const CLAIM_TYPE_LABEL_MAP: Record<CSAdminClaimType, string> = {
  INCORRECT_ANSWER: '정답 오류',
  INCORRECT_EXPLANATION: '해설 오류',
  QUESTION_TEXT_ERROR: '문항 오류/모호함',
  OTHER: '기타',
};

type SelectAllStatus = CSAdminClaimStatus | 'ALL';
type SelectAllClaimType = CSAdminClaimType | 'ALL';

export default function CsClaimsAdminPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CSDomain[]>([]);
  const [tracks, setTracks] = useState<CSAdminTrack[]>([]);
  const [data, setData] = useState<CSAdminClaimOverviewPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expandedClaimId, setExpandedClaimId] = useState<number | null>(null);
  const [updatingStatusClaimId, setUpdatingStatusClaimId] = useState<number | null>(null);

  const [status, setStatus] = useState<SelectAllStatus>('ALL');
  const [claimType, setClaimType] = useState<SelectAllClaimType>('ALL');
  const [domainId, setDomainId] = useState<number | null>(null);
  const [trackId, setTrackId] = useState<number | null>(null);
  const [stageId, setStageId] = useState<number | null>(null);
  const [questionIdInput, setQuestionIdInput] = useState('');

  const [appliedQuery, setAppliedQuery] = useState<CSAdminClaimOverviewQuery>({});

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.trackId === trackId) ?? null,
    [tracks, trackId],
  );

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.totalElements / data.size));
  }, [data]);

  const loadDomains = async () => {
    try {
      const response = await fetchAdminDomains();
      setDomains(response);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: err instanceof Error ? err.message : '도메인 목록을 불러오지 못했습니다.',
      });
    }
  };

  const loadTracks = async (nextDomainId: number) => {
    try {
      const response = await fetchAdminTracks(nextDomainId);
      setTracks(response);
    } catch (err) {
      setTracks([]);
      toast({
        variant: 'destructive',
        title: '오류',
        description: err instanceof Error ? err.message : '트랙 목록을 불러오지 못했습니다.',
      });
    }
  };

  const loadClaims = async (query: CSAdminClaimOverviewQuery, nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminClaimsOverview({
        ...query,
        page: nextPage,
        size: PAGE_SIZE,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신고 목록을 불러오지 못했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDomains();
  }, []);

  useEffect(() => {
    void loadClaims(appliedQuery, page);
  }, [appliedQuery, page]);

  const handleApplyFilters = () => {
    const trimmedQuestionId = questionIdInput.trim();
    let parsedQuestionId: number | undefined;

    if (trimmedQuestionId.length > 0) {
      if (!/^\d+$/.test(trimmedQuestionId)) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: '문항 ID는 숫자만 입력해주세요.',
        });
        return;
      }
      parsedQuestionId = Number(trimmedQuestionId);
    }

    const nextQuery: CSAdminClaimOverviewQuery = {
      status: status === 'ALL' ? undefined : status,
      claimType: claimType === 'ALL' ? undefined : claimType,
      domainId: domainId ?? undefined,
      trackId: trackId ?? undefined,
      stageId: stageId ?? undefined,
      questionId: parsedQuestionId,
    };

    setExpandedClaimId(null);
    setPage(0);
    setAppliedQuery(nextQuery);
  };

  const handleResetFilters = () => {
    setStatus('ALL');
    setClaimType('ALL');
    setDomainId(null);
    setTrackId(null);
    setStageId(null);
    setQuestionIdInput('');
    setTracks([]);
    setExpandedClaimId(null);
    setPage(0);
    setAppliedQuery({});
  };

  const handleDomainChange = async (value: string) => {
    if (value === 'ALL') {
      setDomainId(null);
      setTrackId(null);
      setStageId(null);
      setTracks([]);
      return;
    }

    const parsed = Number(value);
    setDomainId(parsed);
    setTrackId(null);
    setStageId(null);
    await loadTracks(parsed);
  };

  const handleUpdateClaimStatus = async (claimId: number, nextStatus: CSAdminClaimStatus) => {
    try {
      setUpdatingStatusClaimId(claimId);
      await updateAdminClaimStatus(claimId, nextStatus);
      toast({ title: '신고 처리 상태를 변경했습니다.' });
      await loadClaims(appliedQuery, page);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: err instanceof Error ? err.message : '신고 상태 변경에 실패했습니다.',
      });
    } finally {
      setUpdatingStatusClaimId(null);
    }
  };

  return (
    <div className="container mx-auto py-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">CS 신고 통합 관리</h1>
        <p className="text-muted-foreground">전체 신고 내역을 한 번에 조회하고 처리 상태를 변경할 수 있습니다.</p>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">필터</CardTitle>
          <CardDescription>조건을 선택한 뒤 조회를 눌러주세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select value={status} onValueChange={(value) => setStatus(value as SelectAllStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 상태</SelectItem>
                <SelectItem value="RECEIVED">접수</SelectItem>
                <SelectItem value="REVIEWED">검토중</SelectItem>
                <SelectItem value="RESOLVED">완료</SelectItem>
              </SelectContent>
            </Select>

            <Select value={claimType} onValueChange={(value) => setClaimType(value as SelectAllClaimType)}>
              <SelectTrigger>
                <SelectValue placeholder="신고 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 유형</SelectItem>
                <SelectItem value="INCORRECT_ANSWER">정답 오류</SelectItem>
                <SelectItem value="INCORRECT_EXPLANATION">해설 오류</SelectItem>
                <SelectItem value="QUESTION_TEXT_ERROR">문항 오류/모호함</SelectItem>
                <SelectItem value="OTHER">기타</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={questionIdInput}
              onChange={(event) => setQuestionIdInput(event.target.value)}
              placeholder="문항 ID (숫자)"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select value={domainId === null ? 'ALL' : String(domainId)} onValueChange={handleDomainChange}>
              <SelectTrigger>
                <SelectValue placeholder="도메인" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 도메인</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={String(domain.id)}>
                    {domain.id}. {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={trackId === null ? 'ALL' : String(trackId)}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  setTrackId(null);
                  setStageId(null);
                  return;
                }
                setTrackId(Number(value));
                setStageId(null);
              }}
              disabled={domainId === null || tracks.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="트랙" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 트랙</SelectItem>
                {tracks.map((track) => (
                  <SelectItem key={track.trackId} value={String(track.trackId)}>
                    {track.trackNo}. {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={stageId === null ? 'ALL' : String(stageId)}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  setStageId(null);
                  return;
                }
                setStageId(Number(value));
              }}
              disabled={trackId === null || !selectedTrack}
            >
              <SelectTrigger>
                <SelectValue placeholder="스테이지" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 스테이지</SelectItem>
                {(selectedTrack?.stages ?? []).map((stage) => (
                  <SelectItem key={stage.stageId} value={String(stage.stageId)}>
                    스테이지 {stage.stageNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              초기화
            </Button>
            <Button onClick={handleApplyFilters}>조회</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">신고 내역</CardTitle>
          <CardDescription>
            총 <span className="font-semibold text-foreground">{data?.totalElements ?? 0}</span>건
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>신고 내역을 불러오는 중입니다...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm text-destructive">
              <div className="mb-3">{error}</div>
              <Button variant="outline" onClick={() => void loadClaims(appliedQuery, page)}>
                다시 시도
              </Button>
            </div>
          )}

          {!loading && !error && data && data.content.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">조건에 맞는 신고 내역이 없습니다.</div>
          )}

          {!loading &&
            !error &&
            data &&
            data.content.map((item) => {
              const isExpanded = expandedClaimId === item.claimId;
              const shortDescription =
                item.description.length > 120 ? `${item.description.slice(0, 120)}...` : item.description;

              return (
                <Card key={item.claimId} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{STATUS_LABEL_MAP[item.status]}</Badge>
                        <Badge variant="secondary">{CLAIM_TYPE_LABEL_MAP[item.claimType]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('ko-KR')}
                      </div>
                    </div>

                    <div className="mb-2 text-sm text-muted-foreground">
                      문항 ID: <span className="font-semibold text-foreground">{item.questionId}</span> · 도메인{' '}
                      <span className="font-semibold text-foreground">{item.domainId}. {item.domainName}</span> · 트랙{' '}
                      <span className="font-semibold text-foreground">{item.trackNo}. {item.trackName}</span> · 스테이지{' '}
                      <span className="font-semibold text-foreground">{item.stageNo}</span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {isExpanded ? item.description : shortDescription}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant={item.status === 'RECEIVED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => void handleUpdateClaimStatus(item.claimId, 'RECEIVED')}
                        disabled={updatingStatusClaimId === item.claimId || item.status === 'RECEIVED'}
                      >
                        접수
                      </Button>
                      <Button
                        type="button"
                        variant={item.status === 'REVIEWED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => void handleUpdateClaimStatus(item.claimId, 'REVIEWED')}
                        disabled={updatingStatusClaimId === item.claimId || item.status === 'REVIEWED'}
                      >
                        검토중
                      </Button>
                      <Button
                        type="button"
                        variant={item.status === 'RESOLVED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => void handleUpdateClaimStatus(item.claimId, 'RESOLVED')}
                        disabled={updatingStatusClaimId === item.claimId || item.status === 'RESOLVED'}
                      >
                        완료
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedClaimId(isExpanded ? null : item.claimId)}
                      >
                        {isExpanded ? '접기' : '상세'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {!loading && !error && data && data.totalElements > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={page <= 0}
              >
                이전
              </Button>
              <div className="text-sm text-muted-foreground">
                {page + 1} / {totalPages} 페이지
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page + 1 >= totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
