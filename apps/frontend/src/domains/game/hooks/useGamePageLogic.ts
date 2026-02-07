import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getGameRooms,
  createGameRoom,
  enterGameRoom,
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
import { useGameLobbySocket } from '@/domains/game/hooks/useGameLobbySocket';


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

  const [rooms, setRooms] = useState<GameRoom[]>([]);
  // 로딩 상태
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // 방 목록 조회
  const refreshRooms = useCallback(async () => {
    const data = await getGameRooms();
    setRooms(data);
  }, []);

  // 실시간 로비 이벤트 핸들러
  useGameLobbySocket({
    onRoomCreated: (data: any) => {
      console.log('[Lobby] New room created:', data);
      // 새 방 추가
      const newRoom: GameRoom = {
        id: data.roomId,
        title: data.title,
        mode: data.mode as GameMode,
        teamType: data.teamType as TeamType,
        status: data.status as GameStatus,
        isPrivate: data.isPrivate,
        maxPlayers: data.maxPlayers,
        currentPlayers: data.currentPlayers,
        timeLimit: 0, // Backend doesn't send this in lobby broadcast
        problemCount: 0, // Backend doesn't send this in lobby broadcast
        host: {
          id: 0, // Backend doesn't send host ID in lobby broadcast
          nickname: data.hostNickname,
          profileImg: '',
        },
        tags: [],
        tierMin: '',
        tierMax: '',
      };
      setRooms((prev) => [newRoom, ...prev]);
    },
    onRoomUpdated: (data: any) => {
      console.log('[Lobby] Room status updated:', data);
      // 방 상태 업데이트
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId ? { ...room, status: data.status as GameStatus } : room,
        ),
      );
    },
    onRoomDeleted: (data: any) => {
      console.log('[Lobby] Room deleted:', data);
      // 방 목록에서 제거
      setRooms((prev) => prev.filter((room) => room.id !== data.roomId));
    },
    onPlayerUpdate: (data: any) => {
      console.log('[Lobby] Player count updated:', data);
      // 방 인원수 업데이트
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId ? { ...room, currentPlayers: data.currentPlayers } : room,
        ),
      );
    },
    onHostUpdated: (data: any) => {
      console.log('[Lobby] Host updated:', data);
      // 방장 정보 업데이트
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.roomId
            ? {
              ...room,
              host: {
                ...room.host,
                nickname: data.hostNickname,
              },
            }
            : room,
        ),
      );
    },
  });

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
      // 공개 방일 경우 바로 이동 (페이지에서 프리조인/입장 처리)
      router.push(`/game/${room.id}`);
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



  const handleCreateRoom = async (formData: GameCreationFormData) => {
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
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
        // await refreshRooms(); // 방 목록 새로고침 대기 제거 -> 즉시 입장
        router.push(`/game/${roomId}`);
      } else {
        toast.error('방 생성에 실패했습니다.');
        setIsCreatingRoom(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('방 생성 중 오류가 발생했습니다.');
      setIsCreatingRoom(false);
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
    filteredRooms,
    isCreatingRoom,
    setCreateModalOpen,
    setPasswordModalOpen,
    setSelectedRoom,
    setSearchQuery,
    setStatusFilter,
    handleModeSelect,
    handleRoomClick,
    handlePasswordSubmit,
    handleCreateRoom,
    resetFilters,
  };
}

