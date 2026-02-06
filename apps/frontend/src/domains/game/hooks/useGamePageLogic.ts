import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getGameRooms,
  createGameRoom,
  enterGameRoom,
  getGameRoomByCode,
  type GameCreateRequest,
} from '@/domains/game/api/game-api';
import {
  type GameRoom,
  type GameMode,
  type TeamType,
  type GameStatus,
  type GameCreationFormData,
} from '@/domains/game/types/game-types';
import { filterGameRooms } from '@/domains/game/utils/game-utils';


export type StatusFilter = GameStatus | 'ALL';

export function useGamePageLogic() {
  const router = useRouter();

  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedTeamType, setSelectedTeamType] = useState<TeamType | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 모달 상태
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteJoinModalOpen, setInviteJoinModalOpen] = useState(false);
  const [rooms, setRooms] = useState<GameRoom[]>([]);

  // 방 목록 조회
  const refreshRooms = useCallback(async () => {
    const data = await getGameRooms();
    setRooms(data);
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);


  const filteredRooms = useMemo(() => {
    return filterGameRooms(rooms, {

      mode: selectedMode || undefined,
      teamType: selectedTeamType || undefined,
      status: statusFilter,
      search: searchQuery,
    });
  }, [rooms, selectedMode, selectedTeamType, statusFilter, searchQuery]);


  const handleModeSelect = (mode: GameMode, teamType: TeamType) => {
    if (selectedMode === mode && selectedTeamType === teamType) {
      // 이미 선택된 모드를 다시 클릭하면 선택 해제
      setSelectedMode(null);
      setSelectedTeamType(null);
    } else {
      setSelectedMode(mode);
      setSelectedTeamType(teamType);
    }
  };

  const handleRoomClick = async (room: GameRoom) => {
    // 진행 중인 방은 입장 불가
    if (room.status === 'PLAYING') {
      toast.error('진행 중인 방에는 입장할 수 없습니다');
      return;
    }

    if (room.isPrivate) {
      // 비공개 방일 경우 비밀번호 모달 표시
      setSelectedRoom(room);
      setPasswordModalOpen(true);
    } else {
      // 공개 방일 경우 입장 API 호출 후 성공 시 이동
      try {
        const success = await enterGameRoom(room.id);
        if (success) {
          router.push(`/game/${room.id}`);
        } else {
          toast.error('방 입장에 실패했습니다.');
        }
      } catch (error: any) {
        toast.error(error.message || '방 입장에 실패했습니다.');
      }
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedRoom) return;

    try {
      const success = await enterGameRoom(selectedRoom.id, password);
      if (success) {
        setPasswordModalOpen(false);
        router.push(`/game/${selectedRoom.id}`);
      } else {
        toast.error('비밀번호가 일치하지 않거나 입장에 실패했습니다.');
      }
    } catch (error: any) {
      toast.error(error.message || '입장에 실패했습니다.');
    }
  };

  const handleInviteCodeJoin = async (code: string) => {
    try {
      const room = await getGameRoomByCode(code);
      if (!room) {
        toast.error('유효하지 않은 초대 코드입니다.');
        return;
      }

      if (room.status === 'PLAYING') {
        toast.error('진행 중인 방에는 입장할 수 없습니다');
        return;
      }

      if (room.isPrivate) {
        setInviteJoinModalOpen(false);
        setSelectedRoom(room);
        setPasswordModalOpen(true);
      } else {
        const success = await enterGameRoom(room.id);
        if (success) {
          setInviteJoinModalOpen(false);
          router.push(`/game/${room.id}`);
        } else {
          toast.error('방 입장에 실패했습니다.');
        }
      }
    } catch (error: any) {
      toast.error(error.message || '방 입장에 실패했습니다.');
    }
  };

  const handleCreateRoom = async (formData: GameCreationFormData) => {
    // GameCreationFormData -> GameCreateRequest 변환
    const requestData: GameCreateRequest = {
      title: formData.title,
      mode: formData.mode,
      teamType: formData.teamType,
      maxPlayers: formData.maxPlayers,
      timeLimit: formData.timeLimit,
      problemCount: formData.problemCount,
      password: formData.password || undefined, // 빈 문자열이면 undefined 처리
      problemSource: formData.problemSource,
      tierMin: formData.tierMin,
      tierMax: formData.tierMax,
      selectedWorkbookId: formData.selectedWorkbookId || undefined, // null -> undefined 변환
      selectedTags: formData.selectedTags,
    };

    const roomId = await createGameRoom(requestData);
    if (roomId) {
      toast.success('방이 생성되었습니다.');
      setCreateModalOpen(false);
      await refreshRooms();
      router.push(`/game/${roomId}`);
    } else {
      toast.error('방 생성에 실패했습니다.');
    }
  };

  const resetFilters = () => {
    setSelectedMode(null);
    setSelectedTeamType(null);
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  return {
    selectedMode,
    selectedTeamType,
    statusFilter,
    searchQuery,
    passwordModalOpen,
    selectedRoom,
    createModalOpen,
    inviteJoinModalOpen,
    filteredRooms,
    setCreateModalOpen,
    setPasswordModalOpen,
    setInviteJoinModalOpen,
    setSelectedRoom,
    setSearchQuery,
    setStatusFilter,
    handleModeSelect,
    handleRoomClick,
    handlePasswordSubmit,
    handleInviteCodeJoin,
    handleCreateRoom,
    resetFilters,
  };
}

