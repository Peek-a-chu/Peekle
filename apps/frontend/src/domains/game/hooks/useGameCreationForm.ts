import { useState, useCallback, useRef } from 'react';
import {
  type GameMode,
  type TeamType,
  type GameCreationFormData,
} from '@/domains/game/types/game-types';
import { defaultGameCreationForm } from '@/domains/game/constants/game-constants';

export function useGameCreationForm(
  onSubmit?: (formData: GameCreationFormData) => void,
  onOpenChange?: (open: boolean) => void,
) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<GameCreationFormData>(defaultGameCreationForm);
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 숫자 입력 필드 로컬 상태 (지우고 다시 쓸 수 있게)
  const [maxPlayersInput, setMaxPlayersInput] = useState(String(formData.maxPlayers));
  const [timeLimitInput, setTimeLimitInput] = useState(String(formData.timeLimit));
  const [problemCountInput, setProblemCountInput] = useState(String(formData.problemCount));

  // 폼 데이터 업데이트 헬퍼
  const updateForm = useCallback(
    <K extends keyof GameCreationFormData>(key: K, value: GameCreationFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // 게임 모드 선택 핸들러
  const handleModeSelect = (mode: GameMode, teamType: TeamType) => {
    updateForm('mode', mode);
    updateForm('teamType', teamType);

    // 모드에 따른 기본값 설정
    if (teamType === 'TEAM') {
      // 팀전: 짝수만 가능, 최소 4명, 최대 8명 (4vs4)
      let newMaxPlayers = formData.maxPlayers % 2 === 0 ? formData.maxPlayers : formData.maxPlayers + 1;
      newMaxPlayers = Math.min(8, Math.max(4, newMaxPlayers));
      updateForm('maxPlayers', newMaxPlayers);
      setMaxPlayersInput(String(newMaxPlayers));
    }
    if (mode === 'SPEED_RACE' && teamType === 'INDIVIDUAL') {
      // 개인전 스피드: 문제 1개 고정
      updateForm('problemCount', 1);
      setProblemCountInput('1');
    }
  };

  // 인원 수 변경 핸들러 (슬라이더용)
  const handleMaxPlayersChange = (value: number) => {
    let clamped: number;
    if (formData.teamType === 'TEAM') {
      const evenValue = Math.round(value / 2) * 2;
      clamped = Math.min(8, Math.max(4, evenValue));
    } else {
      clamped = Math.min(8, Math.max(2, value));
    }
    updateForm('maxPlayers', clamped);
    setMaxPlayersInput(String(clamped));
  };

  // 제한 시간 변경 핸들러 (슬라이더용)
  const handleTimeLimitChange = (value: number) => {
    updateForm('timeLimit', value);
    setTimeLimitInput(String(value));
  };

  // 문제 수 변경 핸들러 (슬라이더용)
  const handleProblemCountChange = (value: number) => {
    updateForm('problemCount', value);
    setProblemCountInput(String(value));
  };

  // 인원 수 입력 블러 핸들러 (클램핑)
  const handleMaxPlayersBlur = () => {
    const value = maxPlayersInput === '' ? 0 : Number(maxPlayersInput);
    if (formData.teamType === 'TEAM') {
      const evenValue = Math.round(value / 2) * 2;
      const clamped = Math.min(8, Math.max(4, evenValue));
      updateForm('maxPlayers', clamped);
      setMaxPlayersInput(String(clamped));
    } else {
      const clamped = Math.min(8, Math.max(2, value));
      updateForm('maxPlayers', clamped);
      setMaxPlayersInput(String(clamped));
    }
  };

  // 제한 시간 입력 블러 핸들러 (클램핑)
  const handleTimeLimitBlur = () => {
    const value = timeLimitInput === '' ? 0 : Number(timeLimitInput);
    const clamped = Math.min(240, Math.max(10, value));
    updateForm('timeLimit', clamped);
    setTimeLimitInput(String(clamped));
  };

  // 문제 수 입력 블러 핸들러 (클램핑)
  const handleProblemCountBlur = () => {
    const value = problemCountInput === '' ? 0 : Number(problemCountInput);
    const clamped = Math.min(10, Math.max(1, value));
    updateForm('problemCount', clamped);
    setProblemCountInput(String(clamped));
  };

  // 태그 토글 핸들러
  const handleTagToggle = (tag: string) => {
    const newTags = formData.selectedTags.includes(tag)
      ? formData.selectedTags.filter((t) => t !== tag)
      : [...formData.selectedTags, tag];
    updateForm('selectedTags', newTags);
  };

  // 탭 이동 핸들러
  const handleStepChange = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const resetForm = () => {
    setFormData(defaultGameCreationForm);
    setCurrentStep(0);
    setTitleError(false);
    setMaxPlayersInput(String(defaultGameCreationForm.maxPlayers));
    setTimeLimitInput(String(defaultGameCreationForm.timeLimit));
    setProblemCountInput(String(defaultGameCreationForm.problemCount));
  };

  // 제출
  const handleSubmit = () => {
    // 제목 검증
    if (!formData.title.trim()) {
      setTitleError(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return;
    }

    console.log('게임 생성:', formData);
    onSubmit?.(formData);
    onOpenChange?.(false);
    resetForm();
  };

  // 모달 닫기
  const handleClose = () => {
    onOpenChange?.(false);
    resetForm();
  };

  return {
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
  };
}
