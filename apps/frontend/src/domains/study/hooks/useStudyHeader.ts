import { useRoomStore, selectIsOwner } from '@/domains/study/hooks/useRoomStore';

export function useStudyHeader() {
  const roomTitle = useRoomStore((state) => state.roomTitle);
  const whiteboardMessage = useRoomStore((state) => state.whiteboardMessage);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const isOwner = useRoomStore(selectIsOwner);

  return {
    roomTitle,
    whiteboardMessage,
    isWhiteboardActive,
    isOwner,
  };
}
