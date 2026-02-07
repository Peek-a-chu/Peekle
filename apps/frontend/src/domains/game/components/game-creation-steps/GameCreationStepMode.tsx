import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GameModeCard } from '../game-mode-card';
import {
  type GameMode,
  type TeamType,
  type GameCreationFormData,
} from '@/domains/game/types/game-types';
import { gameModes } from '@/domains/game/constants/game-constants';

interface GameCreationStepModeProps {
  formData: GameCreationFormData;
  onUpdateForm: <K extends keyof GameCreationFormData>(
    key: K,
    value: GameCreationFormData[K],
  ) => void;
  onModeSelect: (mode: GameMode, teamType: TeamType) => void;
}

export function GameCreationStepMode({
  formData,
  onUpdateForm,
  onModeSelect,
}: GameCreationStepModeProps) {
  const isTeamMode = formData.teamType === 'TEAM';

  return (
    <div className="space-y-2">
      {/* 공개/비공개 + 비밀번호 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="private">비공개 방</Label>
          <Switch
            id="private"
            checked={formData.isPrivate}
            onCheckedChange={(checked: boolean) => onUpdateForm('isPrivate', checked)}
          />
        </div>
        {formData.isPrivate && (
          <Input
            id="password"
            type="password"
            placeholder="비밀번호 입력"
            value={formData.password}
            onChange={(e) => onUpdateForm('password', e.target.value)}
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
              isSelected={formData.mode === mode.mode && formData.teamType === mode.teamType}
              onClick={() => onModeSelect(mode.mode, mode.teamType)}
            />
          ))}
        </div>
      </div>

      {/* 팀 구성 안내 (팀전) */}
      {isTeamMode && (
        <div className="rounded-lg bg-muted p-2 -mt-1">
          <p className="text-sm text-muted-foreground">
            🔴 <span className="font-medium text-red-500">Red</span> vs 🔵{' '}
            <span className="font-medium text-blue-500">Blue</span> 2팀으로 진행됩니다
          </p>
        </div>
      )}
    </div>
  );
}
