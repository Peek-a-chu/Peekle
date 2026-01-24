import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { type GameCreationFormData } from '@/domains/game/mocks/mock-data'

interface GameCreationStepSettingsProps {
    formData: GameCreationFormData
    maxPlayersInput: string
    timeLimitInput: string
    problemCountInput: string
    onUpdateForm: <K extends keyof GameCreationFormData>(key: K, value: GameCreationFormData[K]) => void
    onMaxPlayersChange: (value: number) => void
    onTimeLimitChange: (value: number) => void
    onProblemCountChange: (value: number) => void
    onMaxPlayersBlur: () => void
    onTimeLimitBlur: () => void
    onProblemCountBlur: () => void
    setMaxPlayersInput: (value: string) => void
    setTimeLimitInput: (value: string) => void
    setProblemCountInput: (value: string) => void
}

export function GameCreationStepSettings({
    formData,
    maxPlayersInput,
    timeLimitInput,
    problemCountInput,
    onUpdateForm,
    onMaxPlayersChange,
    onTimeLimitChange,
    onProblemCountChange,
    onMaxPlayersBlur,
    onTimeLimitBlur,
    onProblemCountBlur,
    setMaxPlayersInput,
    setTimeLimitInput,
    setProblemCountInput,
}: GameCreationStepSettingsProps) {
    // 개인전 스피드 모드인지 확인
    const isIndividualSpeed = formData.mode === 'SPEED_RACE' && formData.teamType === 'INDIVIDUAL'
    // 타임어택 모드인지 확인
    const isTimeAttack = formData.mode === 'TIME_ATTACK'
    // 팀전인지 확인
    const isTeamMode = formData.teamType === 'TEAM'

    return (
        <div className="space-y-6 pt-6">
            {/* 인원 수 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>인원 수 <span className="text-xs text-muted-foreground">({isTeamMode ? '4 ~ 12' : '2 ~ 8'})</span></Label>
                    <span className="text-sm font-medium">{formData.maxPlayers}명</span>
                </div>
                <div className="flex items-center gap-4">
                    <Slider
                        value={[formData.maxPlayers]}
                        onValueChange={([value]) => onMaxPlayersChange(value)}
                        min={isTeamMode ? 4 : 2}
                        max={isTeamMode ? 12 : 8}
                        step={isTeamMode ? 2 : 1}
                        className="flex-1"
                    />
                    <Input
                        type="number"
                        value={maxPlayersInput}
                        onChange={(e) => {
                            setMaxPlayersInput(e.target.value)
                            const num = Number(e.target.value)
                            if (!isNaN(num) && num >= (isTeamMode ? 4 : 2) && num <= (isTeamMode ? 12 : 8)) {
                                onUpdateForm('maxPlayers', num)
                            }
                        }}
                        onBlur={onMaxPlayersBlur}
                        className="w-20"
                        min={isTeamMode ? 4 : 2}
                        max={isTeamMode ? 12 : 8}
                        step={isTeamMode ? 2 : 1}
                    />
                </div>
                {isTeamMode && (
                    <p className="text-xs text-muted-foreground">팀전은 짝수 인원만 가능합니다</p>
                )}
            </div>

            {/* 제한 시간 (타임어택 전용) */}
            {isTimeAttack && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>제한 시간 <span className="text-xs text-muted-foreground">(10 ~ 240)</span></Label>
                        <span className="text-sm font-medium">{formData.timeLimit}분</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Slider
                            value={[formData.timeLimit]}
                            onValueChange={([value]) => onTimeLimitChange(value)}
                            min={10}
                            max={240}
                            step={10}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            value={timeLimitInput}
                            onChange={(e) => {
                                setTimeLimitInput(e.target.value)
                                const num = Number(e.target.value)
                                if (!isNaN(num) && num >= 10 && num <= 240) {
                                    onUpdateForm('timeLimit', num)
                                }
                            }}
                            onBlur={onTimeLimitBlur}
                            className="w-20"
                            min={10}
                            max={240}
                        />
                    </div>
                </div>
            )}

            {/* 문제 수 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>문제 수 <span className="text-xs text-muted-foreground">(1 ~ 10)</span></Label>
                    <span className="text-sm font-medium">{formData.problemCount}개</span>
                </div>
                {isIndividualSpeed ? (
                    <p className="text-sm text-muted-foreground">
                        개인전 스피드 모드는 1문제를 가장 빨리 푸는 사람이 승리합니다
                    </p>
                ) : (
                    <div className="flex items-center gap-4">
                        <Slider
                            value={[formData.problemCount]}
                            onValueChange={([value]) => onProblemCountChange(value)}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            value={problemCountInput}
                            onChange={(e) => {
                                setProblemCountInput(e.target.value)
                                const num = Number(e.target.value)
                                if (!isNaN(num) && num >= 1 && num <= 10) {
                                    onUpdateForm('problemCount', num)
                                }
                            }}
                            onBlur={onProblemCountBlur}
                            className="w-20"
                            min={1}
                            max={10}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
