import {
    gameModes,
    BOJ_TIERS,
    mockWorkbooks,
    type GameCreationFormData,
} from '@/domains/game/mocks/mock-data'

interface GameCreationStepConfirmationProps {
    formData: GameCreationFormData
}

export function GameCreationStepConfirmation({ formData }: GameCreationStepConfirmationProps) {
    const isTimeAttack = formData.mode === 'TIME_ATTACK'

    return (
        <div className="space-y-4 pt-6">
            <div className="rounded-lg bg-muted p-4 space-y-3">
                <h3 className="font-semibold">게임 설정 확인</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">방 제목</div>
                    <div className="font-medium">{formData.title || '(미입력)'}</div>

                    <div className="text-muted-foreground">공개 여부</div>
                    <div className="font-medium">{formData.isPrivate ? '비공개' : '공개'}</div>

                    <div className="text-muted-foreground">게임 모드</div>
                    <div className="font-medium">
                        {gameModes.find(
                            (m) => m.mode === formData.mode && m.teamType === formData.teamType
                        )?.title}
                    </div>

                    <div className="text-muted-foreground">인원</div>
                    <div className="font-medium">{formData.maxPlayers}명</div>

                    {isTimeAttack && (
                        <>
                            <div className="text-muted-foreground">제한 시간</div>
                            <div className="font-medium">{formData.timeLimit}분</div>
                        </>
                    )}

                    <div className="text-muted-foreground">문제 수</div>
                    <div className="font-medium">{formData.problemCount}개</div>

                    <div className="text-muted-foreground">문제 출제</div>
                    <div className="font-medium">
                        {formData.problemSource === 'BOJ_RANDOM'
                            ? `BOJ 랜덤 (${BOJ_TIERS.find((t) => t.id === formData.tierMin)?.name} ~ ${BOJ_TIERS.find((t) => t.id === formData.tierMax)?.name})`
                            : `문제집: ${mockWorkbooks.find((w) => w.id === formData.selectedWorkbookId)?.title || '(미선택)'}`}
                    </div>

                    {formData.selectedTags.length > 0 && (
                        <>
                            <div className="text-muted-foreground">선택 태그</div>
                            <div className="font-medium">{formData.selectedTags.join(', ')}</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
