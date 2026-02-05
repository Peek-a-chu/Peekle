'use client';

import { Zap, Settings, FileText, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type GameCreationFormData } from '@/domains/game/types/game-types';
import { useGameCreationForm } from '@/domains/game/hooks/useGameCreationForm';

// Steps Components
import { GameCreationStepMode } from './game-creation-steps/GameCreationStepMode';
import { GameCreationStepSettings } from './game-creation-steps/GameCreationStepSettings';
import { GameCreationStepProblem } from './game-creation-steps/GameCreationStepProblem';
import { GameCreationStepConfirmation } from './game-creation-steps/GameCreationStepConfirmation';

interface GameCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (formData: GameCreationFormData) => void;
}

const STEPS = [
  { id: 0, label: '모드', icon: Zap },
  { id: 1, label: '설정', icon: Settings },
  { id: 2, label: '문제 출제', icon: FileText },
  { id: 3, label: '확인', icon: CheckCircle },
];

export function GameCreationModal({ open, onOpenChange, onSubmit }: GameCreationModalProps) {
  const {
    currentStep,
    formData,
    titleError,
    titleInputRef,
    maxPlayersInput,
    timeLimitInput,
    problemCountInput,
    setMaxPlayersInput,
    setTimeLimitInput,
    setProblemCountInput,
    updateForm,
    handleModeSelect,
    handleMaxPlayersChange,
    handleTimeLimitChange,
    handleProblemCountChange,
    handleMaxPlayersBlur,
    handleTimeLimitBlur,
    handleProblemCountBlur,
    handleTagToggle,
    handleStepChange,
    handleSubmit,
    handleClose,
    setCurrentStep,
    setTitleError,
  } = useGameCreationForm(onSubmit, onOpenChange);

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
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepChange(step.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      currentStep === step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {step.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 오른쪽 콘텐츠 영역 */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: 모드 */}
              {currentStep === 0 && (
                <GameCreationStepMode
                  formData={formData}
                  titleError={titleError}
                  titleInputRef={titleInputRef}
                  onUpdateForm={updateForm}
                  onModeSelect={handleModeSelect}
                  onTitleErrorReset={() => setTitleError(false)}
                />
              )}

              {/* Step 2: 설정 */}
              {currentStep === 1 && (
                <GameCreationStepSettings
                  formData={formData}
                  maxPlayersInput={maxPlayersInput}
                  timeLimitInput={timeLimitInput}
                  problemCountInput={problemCountInput}
                  onUpdateForm={updateForm}
                  onMaxPlayersChange={handleMaxPlayersChange}
                  onTimeLimitChange={handleTimeLimitChange}
                  onProblemCountChange={handleProblemCountChange}
                  onMaxPlayersBlur={handleMaxPlayersBlur}
                  onTimeLimitBlur={handleTimeLimitBlur}
                  onProblemCountBlur={handleProblemCountBlur}
                  setMaxPlayersInput={setMaxPlayersInput}
                  setTimeLimitInput={setTimeLimitInput}
                  setProblemCountInput={setProblemCountInput}
                />
              )}

              {/* Step 3: 문제 출제 */}
              {currentStep === 2 && (
                <GameCreationStepProblem
                  formData={formData}
                  onUpdateForm={updateForm}
                  onTagToggle={handleTagToggle}
                />
              )}

              {/* Step 4: 확인 */}
              {currentStep === 3 && <GameCreationStepConfirmation formData={formData} />}
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
                  <Button onClick={handleSubmit}>생성하기</Button>
                ) : (
                  <Button onClick={() => setCurrentStep(currentStep + 1)}>다음</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
