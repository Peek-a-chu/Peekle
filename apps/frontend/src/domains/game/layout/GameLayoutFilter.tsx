import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GameModeCard } from '@/domains/game/components/game-mode-card'
import {
    gameModes,
    type GameMode,
    type TeamType,
    type GameStatus,
} from '@/domains/game/mocks/mock-data'

type StatusFilter = GameStatus | 'ALL'

interface GameLayoutFilterProps {
    selectedMode: GameMode | null
    selectedTeamType: TeamType | null
    searchQuery: string
    statusFilter: StatusFilter
    onModeSelect: (mode: GameMode, teamType: TeamType) => void
    onSearchChange: (value: string) => void
    onStatusChange: (value: StatusFilter) => void
}

export function GameLayoutFilter({
    selectedMode,
    selectedTeamType,
    searchQuery,
    statusFilter,
    onModeSelect,
    onSearchChange,
    onStatusChange,
}: GameLayoutFilterProps) {
    return (
        <>
            {/* 게임 모드 선택 카드 - 2x2 그리드 */}
            <section className="mb-8">
                <div className="grid grid-cols-2 gap-4">
                    {gameModes.map((mode) => (
                        <GameModeCard
                            key={`${mode.mode}-${mode.teamType}`}
                            mode={mode.mode}
                            teamType={mode.teamType}
                            title={mode.title}
                            description={mode.description}
                            isSelected={selectedMode === mode.mode && selectedTeamType === mode.teamType}
                            onClick={() => onModeSelect(mode.mode, mode.teamType)}
                        />
                    ))}
                </div>
            </section>

            {/* 검색바 */}
            <section className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="게임방 검색(제목, 태그..)"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </section>

            {/* 필터 탭 */}
            <section className="mb-6">
                <Tabs value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
                    <TabsList className="bg-muted/50 p-1 border border-border">
                        <TabsTrigger
                            value="ALL"
                            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                        >전체</TabsTrigger>
                        <TabsTrigger
                            value="WAITING"
                            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                        >대기 중</TabsTrigger>
                        <TabsTrigger
                            value="PLAYING"
                            className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                        >진행 중</TabsTrigger>
                    </TabsList>
                </Tabs>
            </section>
        </>
    )
}
