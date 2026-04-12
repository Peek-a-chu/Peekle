import CSStageResultPageClient from '@/domains/cs/components/session/CSStageResultPageClient';

interface CSStageResultPageProps {
  params: Promise<{ stageId: string }>;
}

export default async function CSStageResultPage({ params }: CSStageResultPageProps) {
  const { stageId: rawStageId } = await params;
  const stageId = parseInt(rawStageId, 10);

  if (Number.isNaN(stageId)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="font-bold text-destructive">잘못된 스테이지 ID입니다.</p>
      </div>
    );
  }

  return <CSStageResultPageClient stageId={stageId} />;
}

