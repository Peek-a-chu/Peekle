import CSLearningSession from '@/domains/cs/components/session/CSLearningSession';

interface CSStagePageProps {
  params: Promise<{ stageId: string }>;
}

export default async function CSStagePage({ params }: CSStagePageProps) {
  const { stageId: rawStageId } = await params;
  const stageId = parseInt(rawStageId, 10);
  
  if (isNaN(stageId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-destructive font-bold">잘못된 스테이지 ID입니다.</p>
      </div>
    );
  }

  return <CSLearningSession stageId={stageId} />;
}
