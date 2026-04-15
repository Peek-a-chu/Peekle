'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { fetchCSBootstrap, skipCurrentCSTrack, CSBootstrapResponse } from '@/domains/cs/api/csApi';
import DomainSelection from '@/domains/cs/components/DomainSelection';
import LearningMap from '@/domains/cs/components/LearningMap';
import CSTopBar from '@/domains/cs/components/CSTopBar';
import CSModeSwitch from '@/domains/cs/components/CSModeSwitch';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootstrapData, setBootstrapData] = useState<CSBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipTargetTrack, setSkipTargetTrack] = useState<{ trackNo: number; trackName?: string } | null>(null);
  const forceSelection = searchParams.get('mode') === 'add';

  const setAddMode = (isAddMode: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isAddMode) params.set('mode', 'add');
    else params.delete('mode');
    const query = params.toString();
    router.replace(query ? `/cs?${query}` : '/cs', { scroll: false });
  };

  const loadBootstrap = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] CSPage: fetchCSBootstrap 호출');
      const data = await fetchCSBootstrap();
      setBootstrapData(data);
    } catch (error) {
      toast.error('CS 정보를 불러오지 못했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  const handleSkipTrack = async () => {
    try {
      setSkipDialogOpen(false);
      setLoading(true);
      const skipResult = await skipCurrentCSTrack();
      if (skipResult.isCurriculumCompleted) {
        toast.success('마지막 트랙을 스킵해 커리큘럼을 완료했습니다.');
      } else {
        toast.success(`트랙을 스킵했습니다. (${skipResult.nextTrackNo}-${skipResult.nextStageNo}로 이동)`);
      }
      await loadBootstrap();
    } catch (error) {
      toast.error('트랙 스킵에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleRequestSkipTrack = (targetTrackNo: number, targetTrackName?: string) => {
    setSkipTargetTrack({ trackNo: targetTrackNo, trackName: targetTrackName });
    setSkipDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">CS 학습 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // API spec #141: needsDomainSelection이 true거나 currentDomain이 없으면 선택 화면
  const needsSelection = forceSelection || (bootstrapData?.needsDomainSelection ?? !bootstrapData?.currentDomain);

  if (needsSelection) {
    return (
      <DomainSelection
        isAddMode={forceSelection}
        onCancel={() => {
          console.log('[DEBUG] CSPage: 도메인 추가 취소 → 맵 화면 복귀');
          setAddMode(false);
        }}
        onSuccess={() => {
          console.log('[DEBUG] CSPage: DomainSelection 완료 → bootstrap 재로드');
          setAddMode(false);
          loadBootstrap();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="pt-2">
        <CSModeSwitch />
      </div>
      {bootstrapData?.currentDomain && (
        <CSTopBar
          currentDomain={bootstrapData.currentDomain}
          onDomainChanged={() => {
            console.log('[DEBUG] CSPage: 도메인 변경 완료 → bootstrap 재로드');
            loadBootstrap();
          }}
          onRequestAddDomain={() => {
            console.log('[DEBUG] CSPage: 도메인 추가 요청 → DomainSelection 표시');
            setAddMode(true);
          }}
          onRequestWrongNote={() => {
            console.log('[DEBUG] CSPage: 오답 보기 요청 → 오답노트 페이지 이동');
            router.push('/cs/wrong-problems');
          }}
        />
      )}

      {bootstrapData?.progress?.currentTrackName && (
        <div className="px-6 pt-5">
          <p className="text-xs font-semibold text-muted-foreground">현재 트랙</p>
          <h2 className="text-lg font-bold mt-1">{bootstrapData.progress.currentTrackName}</h2>
        </div>
      )}

      <div className="bg-card rounded-2xl p-8 shadow-sm">
        {bootstrapData?.progress ? (
          <div className="w-full flex flex-col items-center">
            <LearningMap
              progress={bootstrapData.progress}
              stages={bootstrapData.stages ?? []}
              onRequestSkipTrack={handleRequestSkipTrack}
            />
          </div>
        ) : (
          <div className="p-8 border border-dashed border-primary/30 rounded-xl bg-primary/5 text-center">
            <p className="text-lg font-medium text-foreground mb-2">진행도 정보를 불러올 수 없습니다. 🚨</p>
          </div>
        )}
      </div>

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>트랙 스킵</AlertDialogTitle>
            <AlertDialogDescription>
              {skipTargetTrack
                ? `현재 트랙의 남은 단계를 모두 건너뛰고 ${skipTargetTrack.trackNo}트랙의 첫 번째 단계${skipTargetTrack.trackName ? `(${skipTargetTrack.trackName})` : ''}로 이동하시겠습니까?`
                : '현재 트랙의 남은 단계를 모두 건너뛰고 다음 트랙의 첫 번째 단계로 이동하시겠습니까?'}
              <br /><br />
              <span className="text-destructive font-medium">※ 스킵한 단계는 완료로 간주되지 않으며 점수가 부여되지 않습니다. 잠금/미래 스테이지의 개별 스킵은 불가합니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipTrack} className="rounded-xl bg-primary">스킵하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
