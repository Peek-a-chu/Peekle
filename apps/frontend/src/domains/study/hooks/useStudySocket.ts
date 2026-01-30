'use client';

import { useEffect, useCallback } from 'react';
import { useSocketContext } from '@/domains/study/context/SocketContext';
import { useRoomStore, Participant } from '@/domains/study/hooks/useRoomStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { fetchStudyRoom, fetchStudyParticipants } from '../api/studyApi';

export const useStudySocketActions = () => {
  const { client, connected } = useSocketContext();
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);

  const publish = useCallback(
    (destination: string, body: any) => {
      if (!client || !connected) {
        toast.error('서버와 연결되지 않았습니다.');
        return;
      }
      client.publish({ destination, body: JSON.stringify(body) });
    },
    [client, connected],
  );

  const enterStudy = useCallback(() => {
    if (roomId) publish('/pub/studies/enter', { studyId: roomId });
  }, [roomId, publish]);

  // Exit Room (Session Leave)
  const exitStudy = useCallback(() => {
    if (roomId) publish('/pub/studies/leave', { studyId: roomId });
  }, [roomId, publish]);

  // Quit Group (Persistent Leave)
  const quitStudy = useCallback(() => {
    if (roomId) publish('/pub/studies/quit', { studyId: roomId });
  }, [roomId, publish]);

  const delegateOwner = useCallback(
    (targetUserId: number) => {
      if (roomId) publish('/pub/studies/delegate', { studyId: roomId, targetUserId });
    },
    [roomId, publish],
  );

  const kickUser = useCallback(
    (targetUserId: number) => {
      if (roomId) publish('/pub/studies/kick', { studyId: roomId, targetUserId });
    },
    [roomId, publish],
  );

  const deleteStudy = useCallback(() => {
    if (roomId) publish('/pub/studies/delete', { studyId: roomId });
  }, [roomId, publish]);

  const updateStudyInfo = useCallback(
    (title: string, description: string) => {
      if (roomId) publish('/pub/studies/info/update', { studyId: roomId, title, description });
    },
    [roomId, publish],
  );

  const addProblem = useCallback(
    (problemId: number) => {
      if (roomId) publish('/pub/studies/problems', { action: 'ADD', problemId });
    },
    [roomId, publish],
  );

  const removeProblem = useCallback(
    (problemId: number) => {
      if (roomId) publish('/pub/studies/problems', { action: 'REMOVE', problemId });
    },
    [roomId, publish],
  );

  const updateStatus = useCallback(
    (isMuted: boolean, isVideoOff: boolean) => {
      if (roomId) publish('/pub/studies/status', { studyId: roomId, isMuted, isVideoOff });
    },
    [roomId, publish],
  );

  return {
    enterStudy,
    exitStudy,
    quitStudy,
    delegateOwner,
    kickUser,
    deleteStudy,
    updateStudyInfo,
    addProblem,
    removeProblem,
    updateStatus,
  };
};

export const useStudySocketSubscription = (studyId: number) => {
  const router = useRouter();
  const { client, connected } = useSocketContext();
  const {
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setRoomInfo,
    currentUserId,
    participants,
  } = useRoomStore();

  useEffect(() => {
    if (!client || !connected || !studyId) return;

    // 1. Enter Study
    console.log('[StudySocket] Sending ENTER');
    client.publish({ destination: '/pub/studies/enter', body: JSON.stringify({ studyId }) });

    // 2. Subscribe Public Room Topic
    const publicTopic = `/topic/studies/rooms/${studyId}`;
    console.log('[StudySocket] Subscribing to Public:', publicTopic);

    const publicSubscription = client.subscribe(publicTopic, (message) => {
      handleSocketMessage(message);
    });

    // 3. Subscribe Private User Topic (For ROOM_INFO, ERROR etc)
    let privateSubscription: any = null;
    if (currentUserId) {
      const privateTopic = `/topic/studies/${studyId}/info/${currentUserId}`;
      console.log('[StudySocket] Subscribing to Private:', privateTopic);
      privateSubscription = client.subscribe(privateTopic, (message) => {
        handleSocketMessage(message);
      });
    }

    // Helper to handle messages
    const handleSocketMessage = async (message: any) => {
      if (!message.body) return;
      try {
        const payload = JSON.parse(message.body);
        const { type, data } = payload;
        console.log('[StudySocket] Received:', type, data);

        const stateParticipants = useRoomStore.getState().participants;

        switch (type) {
          case 'ENTER': {
            // data is userId (number)
            const enteredUserId = data;
            try {
              const members = await fetchStudyParticipants(studyId);
              setParticipants(members);
              const enteredMember = members.find((p) => p.id === enteredUserId);
              if (enteredMember && enteredUserId !== useRoomStore.getState().currentUserId) {
                toast.info(`${enteredMember.nickname}님이 입장하셨습니다.`);
              }
            } catch (e) {
              console.error('Failed to refresh participants on ENTER', e);
            }
            break;
          }
          case 'LEAVE': {
            const leftUserId = data;
            updateParticipant(leftUserId, { isOnline: false });
            break;
          }
          case 'QUIT': {
            const quitUserId = data;
            removeParticipant(quitUserId);
            break;
          }
          case 'DELEGATE': {
            const newOwnerId = data;
            try {
              const members = await fetchStudyParticipants(studyId);
              setParticipants(members);
              const newOwner = members.find((p) => p.id === newOwnerId);
              if (newOwner) toast.info(`방장이 ${newOwner.nickname}님으로 변경되었습니다.`);
            } catch (e) {
              console.error('Failed to refresh on DELEGATE', e);
            }
            break;
          }
          case 'KICK': {
            const kickedUserId = data;
            if (useRoomStore.getState().currentUserId === kickedUserId) {
              toast.error('스터디에서 강퇴되었습니다.');
              router.replace('/home');
            } else {
              removeParticipant(kickedUserId);
              const kickedMember = stateParticipants.find((p) => p.id === kickedUserId);
              if (kickedMember) toast.info(`${kickedMember.nickname}님이 강퇴되었습니다.`);
            }
            break;
          }
          case 'DELETE': {
            toast.error('방장에 의해 스터디가 삭제되었습니다.');
            router.replace('/home');
            break;
          }
          case 'ROOM_INFO': {
            const { title, description, role } = data;
            setRoomInfo({ roomTitle: title, roomDescription: description, myRole: role });
            // toast.info('스터디 정보가 갱신되었습니다.');
            break;
          }
          case 'INFO': {
            const { title, description } = data;
            setRoomInfo({ roomTitle: title, roomDescription: description });
            toast.info('스터디 정보가 변경되었습니다.');
            break;
          }
          case 'STATUS': {
            const { userId, isMuted, isVideoOff } = data;
            updateParticipant(userId, { isMuted, isVideoOff });
            break;
          }
        }
      } catch (e) {
        console.error('[StudySocket] Error parsing message', e);
      }
    };

    return () => {
      publicSubscription.unsubscribe();
      if (privateSubscription) privateSubscription.unsubscribe();

      // 3. Leave Study (Session Exit)
      if (client && client.connected) {
        console.log('[StudySocket] Sending LEAVE');
        client.publish({ destination: '/pub/studies/leave', body: JSON.stringify({ studyId }) });
      }
    };
  }, [
    client,
    connected,
    studyId,
    router,
    setParticipants,
    updateParticipant,
    removeParticipant,
    setRoomInfo,
  ]);
};
