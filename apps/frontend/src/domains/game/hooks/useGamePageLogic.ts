import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import {
  getGameRooms,
  createGameRoom,
  enterGameRoom,
  reserveRoomSlot,
  confirmRoomReservation,
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
  const { user } = useAuthStore();

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
      // 내가 만든 방이면 목록에 추가하지 않음 (로비에서 깜빡임 방지 & 바로 입장 처리됨)
      if (user && data.host?.id === user.id) {
        console.log('[Lobby] Skipping own room creation event:', data.roomId);
        return;
      }

      // 새 방 추가
      const newRoom: GameRoom = {
        id: data.roomId,
        title: data.title,
        mode: data.mode as GameMode,
        teamType: data.teamType as TeamType,
        status: data.status as GameStatus,
        isPrivate: data.isSecret, // Backend sends "isSecret", Frontend uses "isPrivate"
        maxPlayers: data.maxPlayers,
        currentPlayers: data.currentPlayers,
        timeLimit: data.timeLimit || 0,
        problemCount: data.problemCount || 0,
        host: {
          id: data.host?.id || 0,
          nickname: data.host?.nickname || data.hostNickname || 'Unknown',
          profileImg: data.host?.profileImg || '',
        },
        tags: data.tags || [],
        tierMin: data.tierMin || 'Bronze 5',
        tierMax: data.tierMax || 'Gold 1',
        workbookTitle: data.workbookTitle,
        problems: (data.problems || []).map((p: any) => ({
          id: Number(p.id),
          externalId: p.externalId,
          title: p.title,
          tier: p.tier,
          url: p.url,
          status: 'UNSOLVED',
        })),
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

    // 🎫 Step 1: Try to reserve a slot first
    try {
      const reservation = await reserveRoomSlot(room.id);

      if (!reservation) {
        toast.error('예약에 실패했습니다.');
        return;
      }

      // Reservation succeeded, proceed with entry
      if (room.isPrivate) {
        // 비공개 방일 경우 비밀번호 모달 표시
        setSelectedRoom(room);
        setPasswordModalOpen(true);
      } else {
        // 공개 방일 경우 바로 이동 (페이지에서 프리조인/입장 처리)
        router.push(`/game/${room.id}`);
      }
    } catch (error: any) {
      // Check error code from API response
      const errorCode = error?.code || error?.error?.code;

      if (errorCode === 'GAME_004') {
        // GAME_ROOM_FULL
        toast.error('방이 가득 찼습니다.');
      } else {
        toast.error(error.message || '방 입장에 실패했습니다.');
      }
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedRoom) return;

    try {
      // Use confirmReservation instead of enterGameRoom
      // The reservation was already made in handleRoomClick
      const success = await confirmRoomReservation(selectedRoom.id, password);
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



  // PreJoin Modal State
  const [creationFormData, setCreationFormData] = useState<GameCreationFormData | null>(null);
  const [showPreJoinModal, setShowPreJoinModal] = useState(false);

  // 1단계: 방 생성 모달에서 "생성하기" 클릭 시 -> 프리조인 모달 오픈
  const handleCreateRoom = async (formData: GameCreationFormData) => {
    if (isCreatingRoom) return;
    setCreationFormData(formData);
    setCreateModalOpen(false);
    setShowPreJoinModal(true);
  };

  // 2단계: 프리조인 모달에서 "방 생성하기" 클릭 시 -> 실제 API 호출
  const handleFinalCreateRoom = async (micEnabled: boolean, camEnabled: boolean) => {
    if (!creationFormData || isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
      // GameCreationFormData -> GameCreateRequest 변환
      const requestData: GameCreateRequest = {
        title: creationFormData.title,
        mode: creationFormData.mode,
        teamType: creationFormData.teamType,
        maxPlayers: creationFormData.maxPlayers,
        timeLimit: creationFormData.timeLimit,
        problemCount: creationFormData.problemCount,
        password: creationFormData.password || undefined,
        problemSource: creationFormData.problemSource,
        tierMin: creationFormData.tierMin,
        tierMax: creationFormData.tierMax,
        selectedWorkbookId: creationFormData.selectedWorkbookId || undefined,
        selectedTags: creationFormData.selectedTags,
      };

      const roomId = await createGameRoom(requestData);
      if (roomId) {
        // toast.success('방이 생성되었습니다.');
        // setShowPreJoinModal(false); // 리다이렉트 될 때까지 모달 유지
        // setCreationFormData(null);
        // 미디어 상태는 로컬 스토리지나 컨텍스트에 저장할 수도 있음 (현재는 단순히 넘김)
        router.push(`/game/${roomId}?prejoined=true&mic=${micEnabled}&cam=${camEnabled}`);
      } else {
        toast.error('방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error(error);
      toast.error('방 생성 중 오류가 발생했습니다.');
    } finally {
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
    // PreJoin related
    showPreJoinModal,
    setShowPreJoinModal,
    creationFormData,
    handleFinalCreateRoom,
    // isCreatingRoom, // Exposed for loading state (ALREADY EXPOSED ABOVE)
    resetFilters,
  };
}

