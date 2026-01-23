'use client'

import { useState, useCallback, useRef } from 'react'
import { Timer, Zap, Users, Settings, FileText, CheckCircle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { GameModeCard } from './game-mode-card'
import {
    gameModes,
    BOJ_TIERS,
    BOJ_TAGS,
    mockWorkbooks,
    defaultGameCreationForm,
    type GameMode,
    type TeamType,
    type GameCreationFormData,
    type ProblemSource,
} from '@/domains/game/mocks/mock-data'

interface GameCreationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit?: (formData: GameCreationFormData) => void
}

const STEPS = [
    { id: 0, label: '모드', icon: Zap },
    { id: 1, label: '설정', icon: Settings },
    { id: 2, label: '문제 출제', icon: FileText },
    { id: 3, label: '확인', icon: CheckCircle },
]

export function GameCreationModal({ open, onOpenChange, onSubmit }: GameCreationModalProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState<GameCreationFormData>(defaultGameCreationForm)
    const [titleError, setTitleError] = useState(false)
    const titleInputRef = useRef<HTMLInputElement>(null)

    // 숫자 입력 필드 로컬 상태 (지우고 다시 쓸 수 있게)
    const [maxPlayersInput, setMaxPlayersInput] = useState(String(formData.maxPlayers))
    const [timeLimitInput, setTimeLimitInput] = useState(String(formData.timeLimit))
    const [problemCountInput, setProblemCountInput] = useState(String(formData.problemCount))

    // 폼 데이터 업데이트 헬퍼
    const updateForm = useCallback(<K extends keyof GameCreationFormData>(
        key: K,
        value: GameCreationFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }, [])

    // 게임 모드 선택 핸들러
    const handleModeSelect = (mode: GameMode, teamType: TeamType) => {
        updateForm('mode', mode)
        updateForm('teamType', teamType)

        // 모드에 따른 기본값 설정
        if (teamType === 'TEAM') {
            // 팀전: 짝수만 가능, 최소 4명
            const newMaxPlayers = Math.max(4, formData.maxPlayers % 2 === 0 ? formData.maxPlayers : formData.maxPlayers + 1)
            updateForm('maxPlayers', newMaxPlayers)
            setMaxPlayersInput(String(newMaxPlayers))
        }
        if (mode === 'SPEED_RACE' && teamType === 'INDIVIDUAL') {
            // 개인전 스피드: 문제 1개 고정
            updateForm('problemCount', 1)
            setProblemCountInput('1')
        }
    }

    // 인원 수 변경 핸들러 (슬라이더용)
    const handleMaxPlayersChange = (value: number) => {
        let clamped: number
        if (formData.teamType === 'TEAM') {
            const evenValue = Math.round(value / 2) * 2
            clamped = Math.min(12, Math.max(4, evenValue))
        } else {
            clamped = Math.min(8, Math.max(2, value))
        }
        updateForm('maxPlayers', clamped)
        setMaxPlayersInput(String(clamped))
    }

    // 제한 시간 변경 핸들러 (슬라이더용)
    const handleTimeLimitChange = (value: number) => {
        updateForm('timeLimit', value)
        setTimeLimitInput(String(value))
    }

    // 문제 수 변경 핸들러 (슬라이더용)
    const handleProblemCountChange = (value: number) => {
        updateForm('problemCount', value)
        setProblemCountInput(String(value))
    }

    // 인원 수 입력 블러 핸들러 (클램핑)
    const handleMaxPlayersBlur = () => {
        const value = maxPlayersInput === '' ? 0 : Number(maxPlayersInput)
        if (formData.teamType === 'TEAM') {
            const evenValue = Math.round(value / 2) * 2
            const clamped = Math.min(12, Math.max(4, evenValue))
            updateForm('maxPlayers', clamped)
            setMaxPlayersInput(String(clamped))
        } else {
            const clamped = Math.min(8, Math.max(2, value))
            updateForm('maxPlayers', clamped)
            setMaxPlayersInput(String(clamped))
        }
    }

    // 제한 시간 입력 블러 핸들러 (클램핑)
    const handleTimeLimitBlur = () => {
        const value = timeLimitInput === '' ? 0 : Number(timeLimitInput)
        const clamped = Math.min(240, Math.max(10, value))
        updateForm('timeLimit', clamped)
        setTimeLimitInput(String(clamped))
    }

    // 문제 수 입력 블러 핸들러 (클램핑)
    const handleProblemCountBlur = () => {
        const value = problemCountInput === '' ? 0 : Number(problemCountInput)
        const clamped = Math.min(10, Math.max(1, value))
        updateForm('problemCount', clamped)
        setProblemCountInput(String(clamped))
    }

    // 태그 토글 핸들러
    const handleTagToggle = (tag: string) => {
        const newTags = formData.selectedTags.includes(tag)
            ? formData.selectedTags.filter(t => t !== tag)
            : [...formData.selectedTags, tag]
        updateForm('selectedTags', newTags)
    }

    // 탭 이동 핸들러
    const handleStepChange = (stepId: number) => {
        setCurrentStep(stepId)
    }

    // 제출
    const handleSubmit = () => {
        // 제목 검증
        if (!formData.title.trim()) {
            setTitleError(true)
            setCurrentStep(0) // Step 1(모드)로 이동
            setTimeout(() => {
                titleInputRef.current?.focus()
            }, 100)
            return
        }

        console.log('게임 생성:', formData)
        onSubmit?.(formData)
        onOpenChange(false)
        // 폼 초기화
        setFormData(defaultGameCreationForm)
        setCurrentStep(0)
        setTitleError(false)
        // 입력 필드 초기화
        setMaxPlayersInput(String(defaultGameCreationForm.maxPlayers))
        setTimeLimitInput(String(defaultGameCreationForm.timeLimit))
        setProblemCountInput(String(defaultGameCreationForm.problemCount))
    }

    // 모달 닫기
    const handleClose = () => {
        onOpenChange(false)
        setFormData(defaultGameCreationForm)
        setCurrentStep(0)
        setTitleError(false)
        // 입력 필드 초기화
        setMaxPlayersInput(String(defaultGameCreationForm.maxPlayers))
        setTimeLimitInput(String(defaultGameCreationForm.timeLimit))
        setProblemCountInput(String(defaultGameCreationForm.problemCount))
    }

    // 개인전 스피드 모드인지 확인
    const isIndividualSpeed = formData.mode === 'SPEED_RACE' && formData.teamType === 'INDIVIDUAL'
    // 타임어택 모드인지 확인
    const isTimeAttack = formData.mode === 'TIME_ATTACK'
    // 팀전인지 확인
    const isTeamMode = formData.teamType === 'TEAM'

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
                <div className="flex h-[685px]">
                    {/* 왼쪽 탭 네비게이션 */}
                    <div className="w-48 bg-muted/30 border-r flex flex-col py-6">
                        <DialogHeader className="px-4 pb-4">
                            <DialogTitle className="text-lg">게임방 만들기</DialogTitle>
                        </DialogHeader>
                        <nav className="flex-1 space-y-1 px-2">
                            {STEPS.map((step) => {
                                const Icon = step.icon
                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => handleStepChange(step.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                            currentStep === step.id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {step.label}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* 오른쪽 콘텐츠 영역 */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Step 1: 모드 */}
                            {currentStep === 0 && (
                                <div className="space-y-2">
                                    {/* 방 제목 */}
                                    <div className="space-y-2">
                                        <Label htmlFor="title">방 제목</Label>
                                        <Input
                                            id="title"
                                            ref={titleInputRef}
                                            placeholder="게임방 제목을 입력하세요"
                                            value={formData.title}
                                            onChange={(e) => {
                                                updateForm('title', e.target.value)
                                                if (e.target.value.trim()) setTitleError(false)
                                            }}
                                        />
                                        {titleError && (
                                            <p className="text-sm text-destructive">게임 방 제목을 입력해주세요.</p>
                                        )}
                                    </div>

                                    {/* 공개/비공개 + 비밀번호 */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="private">비공개 방</Label>
                                            <Switch
                                                id="private"
                                                checked={formData.isPrivate}
                                                onCheckedChange={(checked) => updateForm('isPrivate', checked)}
                                            />
                                        </div>
                                        {formData.isPrivate && (
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="비밀번호 입력"
                                                value={formData.password}
                                                onChange={(e) => updateForm('password', e.target.value)}
                                                className="flex-1"
                                            />
                                        )}
                                    </div>

                                    {/* 게임 모드 선택 */}
                                    <div className="space-y-2">
                                        <Label>게임 모드</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {gameModes.map((mode) => (
                                                <GameModeCard
                                                    key={`${mode.mode}-${mode.teamType}`}
                                                    mode={mode.mode}
                                                    teamType={mode.teamType}
                                                    title={mode.title}
                                                    description={mode.description}
                                                    isSelected={
                                                        formData.mode === mode.mode &&
                                                        formData.teamType === mode.teamType
                                                    }
                                                    onClick={() => handleModeSelect(mode.mode, mode.teamType)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* 팀 구성 안내 (팀전) */}
                                    {isTeamMode && (
                                        <div className="rounded-lg bg-muted p-2 -mt-1">
                                            <p className="text-sm text-muted-foreground">
                                                🔴 <span className="font-medium text-red-500">Red</span> vs
                                                🔵 <span className="font-medium text-blue-500">Blue</span> 2팀으로 진행됩니다
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 1 && (
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
                                                onValueChange={([value]) => handleMaxPlayersChange(value)}
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
                                                        updateForm('maxPlayers', num)
                                                    }
                                                }}
                                                onBlur={handleMaxPlayersBlur}
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
                                                    onValueChange={([value]) => handleTimeLimitChange(value)}
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
                                                            updateForm('timeLimit', num)
                                                        }
                                                    }}
                                                    onBlur={handleTimeLimitBlur}
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
                                                    onValueChange={([value]) => handleProblemCountChange(value)}
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
                                                            updateForm('problemCount', num)
                                                        }
                                                    }}
                                                    onBlur={handleProblemCountBlur}
                                                    className="w-20"
                                                    min={1}
                                                    max={10}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: 문제 출제 */}
                            {currentStep === 2 && (
                                <div className="space-y-6 pt-6">
                                    <Tabs
                                        value={formData.problemSource}
                                        onValueChange={(v) => updateForm('problemSource', v as ProblemSource)}
                                    >
                                        <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-lg border-2 border-muted">
                                            <TabsTrigger
                                                value="BOJ_RANDOM"
                                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md transition-all"
                                            >
                                                BOJ 랜덤
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="WORKBOOK"
                                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md transition-all"
                                            >
                                                문제집 선택
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* BOJ 랜덤 탭 */}
                                        <TabsContent value="BOJ_RANDOM" className="space-y-6 mt-4">
                                            {/* 티어 범위 */}
                                            <div className="space-y-3">
                                                <Label>티어 범위</Label>
                                                <div className="flex items-center gap-4">
                                                    <select
                                                        value={formData.tierMin}
                                                        onChange={(e) => updateForm('tierMin', e.target.value)}
                                                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    >
                                                        {BOJ_TIERS.map((tier) => (
                                                            <option key={tier.id} value={tier.id}>
                                                                {tier.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="text-muted-foreground">~</span>
                                                    <select
                                                        value={formData.tierMax}
                                                        onChange={(e) => updateForm('tierMax', e.target.value)}
                                                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    >
                                                        {BOJ_TIERS.map((tier) => (
                                                            <option key={tier.id} value={tier.id}>
                                                                {tier.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* 태그 선택 */}
                                            <div className="space-y-3">
                                                <Label>알고리즘 태그 (선택)</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {BOJ_TAGS.map((tag) => (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => handleTagToggle(tag)}
                                                            className={cn(
                                                                'rounded-full px-3 py-1 text-sm transition-colors',
                                                                formData.selectedTags.includes(tag)
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                            )}
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                                {formData.selectedTags.length > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        선택된 태그: {formData.selectedTags.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </TabsContent>

                                        {/* 문제집 선택 탭 */}
                                        <TabsContent value="WORKBOOK" className="space-y-4 mt-4">
                                            <div className="space-y-3">
                                                {mockWorkbooks.map((workbook) => (
                                                    <button
                                                        key={workbook.id}
                                                        type="button"
                                                        onClick={() => updateForm('selectedWorkbookId', workbook.id)}
                                                        className={cn(
                                                            'w-full rounded-lg border p-4 text-left transition-colors',
                                                            formData.selectedWorkbookId === workbook.id
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:border-primary/50'
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-medium">{workbook.title}</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {workbook.description}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-sm font-medium">
                                                                    {workbook.problemCount}문제
                                                                </span>
                                                                <p className="text-xs text-muted-foreground">
                                                                    by {workbook.creator}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}

                            {/* Step 4: 확인 */}
                            {currentStep === 3 && (
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
                            )}
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex justify-between items-center p-6 border-t bg-background">
                            <Button variant="outline" onClick={handleClose}>
                                취소
                            </Button>
                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                                        이전
                                    </Button>
                                )}
                                {currentStep === 3 ? (
                                    <Button onClick={handleSubmit}>
                                        생성하기
                                    </Button>
                                ) : (
                                    <Button onClick={() => setCurrentStep(currentStep + 1)}>
                                        다음
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
