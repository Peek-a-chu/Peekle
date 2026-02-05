'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '@/domains/study/context/SocketContext';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
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
    (problemId: number, date?: string) => {
      if (roomId) publish('/pub/studies/problems', { action: 'ADD', problemId, problemDate: date });
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

  const muteAll = useCallback(() => {
    if (roomId) publish('/pub/studies/mute-all', { studyId: roomId });
  }, [roomId, publish]);

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
    muteAll,
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
    setVideoToken,
    currentUserId,
    participants,
  } = useRoomStore();

  // useRef는 컴포넌트 최상위 레벨에서만 호출 가능
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    if (!client || !connected || !studyId) return;


    // 1. Enter Study Helper
    const sendEnter = () => {
      console.log('[StudySocket] Sending ENTER', { studyId, currentUserId: currentUserIdRef.current });
      client.publish({ destination: '/pub/studies/enter', body: JSON.stringify({ studyId }) });
    };

    // Note: We do NOT send ENTER here immediately.
    // We wait for `subscribeToPrivateTopics` to succeed first.

    // 2. Subscribe Public Room Topic
    const publicTopic = `/topic/studies/rooms/${studyId}`;
    console.log('[StudySocket] Subscribing to Public:', publicTopic);

    const publicSubscription = client.subscribe(publicTopic, (message) => {
      handleSocketMessage(message);
    });

    // 2-1. Subscribe Curriculum Topic (for problem add/remove)
    const curriculumTopic = `/topic/studies/rooms/${studyId}/problems`;
    console.log('[StudySocket] Subscribing to Curriculum:', curriculumTopic);

    const curriculumSubscription = client.subscribe(curriculumTopic, (message) => {
      handleSocketMessage(message);
    });

    // 3. Subscribe Private User Topic (For ROOM_INFO, ERROR etc)
    let privateSubscription: any = null;
    let videoTokenSubscription: any = null;

    const subscribeToPrivateTopics = () => {
      // Use Ref to ensure we escape stale closures if called via interval
      const effectiveUserId = currentUserIdRef.current;

      // currentUserId가 있으면 구독 생성
      if (effectiveUserId) {
        // 중복 구독 방지: 이미 구독 중이고, ID가 같다면 패스
        if (privateSubscription) {
          // 하지만 ID가 바뀌었을 수도 있으므로 (거의 없지만) 확인할 수도 있음.
          // 여기선 단순화를 위해 기존 구독 해제 후 재구독 (아래 로직)
          privateSubscription.unsubscribe();
        }
        if (videoTokenSubscription) {
          videoTokenSubscription.unsubscribe();
        }

        const privateTopic = `/topic/studies/${studyId}/info/${effectiveUserId}`;
        console.log('[StudySocket] Subscribing to Private:', privateTopic);
        privateSubscription = client.subscribe(privateTopic, (message) => {
          handleSocketMessage(message);
        });

        // 3-1. Subscribe Private Error Topic
        const errorTopic = `/topic/studies/${studyId}/error/${effectiveUserId}`;
        console.log('[StudySocket] Subscribing to Error:', errorTopic);
        const errorSub = client.subscribe(errorTopic, (message) => {
          handleSocketMessage(message);
        });

        const originalUnsubscribe = privateSubscription.unsubscribe;
        privateSubscription.unsubscribe = () => {
          originalUnsubscribe.call(privateSubscription);
          errorSub.unsubscribe();
        };

        // 4. Subscribe Video Token Topic
        const videoTokenTopic = `/topic/studies/${studyId}/video-token/${effectiveUserId}`;
        console.log('[StudySocket] Subscribing to Video Token:', videoTokenTopic);
        videoTokenSubscription = client.subscribe(videoTokenTopic, (message) => {
          handleSocketMessage(message);
        });

        // [Fix] Subscription Complete -> Send ENTER
        // 구독이 *완료된 후*에 입장 메시지를 보내야 응답(VIDEO_TOKEN)을 받을 수 있음
        // STOMP subscribe는 클라이언트 측에서 즉시 처리되므로 바로 보내도 됨.
        console.log('[StudySocket] Subscription ready, sending ENTER');
        sendEnter();
      }
    };

    // 초기 구독 시도
    subscribeToPrivateTopics();

    // Helper to handle messages
    const handleSocketMessage = async (message: any) => {
      if (!message.body) {
        console.warn('[StudySocket] Message received but body is empty');
        return;
      }
      try {
        const payload = JSON.parse(message.body);
        const { type, data } = payload;
        console.log('[StudySocket] Received message:', { type, data, fullPayload: payload });

        const stateParticipants = useRoomStore.getState().participants;

        switch (type) {
          case 'ENTER': {
            const enteredUserId = data;
            // Optimistic update for immediate feedback
            updateParticipant(enteredUserId, { isOnline: true });

            try {
              const members = await fetchStudyParticipants(studyId);
              // Ensure the entering user is marked online, in case API is slightly behind
              const updatedMembers = members.map((p) =>
                p.id === enteredUserId ? { ...p, isOnline: true } : p,
              );
              setParticipants(updatedMembers);

              const enteredMember = updatedMembers.find((p) => p.id === enteredUserId);
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
            const { title, description, role, members } = data;
            setRoomInfo({ roomTitle: title, roomDescription: description, myRole: role });

            // [Fix] Sync participants strictly from server info
            if (members && Array.isArray(members)) {
              console.log('[StudySocket] Syncing participants from ROOM_INFO:', members);

              // Map DTO to Store Interface
              const mappedMembers = members.map((m: any) => ({
                id: m.userId,
                nickname: m.nickname,
                profileImage: m.profileImg,
                isOwner: m.role === 'OWNER',
                isOnline: m.online ?? m.isOnline, // Handle both cases
                isMuted: false,   // Default
                isVideoOff: false // Default
              }));

              setParticipants(mappedMembers);
            }
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
          case 'MUTE_ALL': {
            const senderId = data;
            const { currentUserId, participants } = useRoomStore.getState();

            // 1. Optimistic Update: Mute everyone except the sender
            // using setParticipants to trigger re-render immediately for everyone
            setParticipants(
              participants.map((p) => {
                if (p.id === senderId) return p; // Sender keeps status
                return { ...p, isMuted: true }; // Everyone else muted locally
              }),
            );

            // 2. If I am a victim (not sender), report status to server
            if (currentUserId && currentUserId !== senderId) {
              toast.warning('방장에 의해 음소거 되었습니다.');

              // Fetch my current video state to preserve it
              const me = participants.find((p) => p.id === currentUserId);
              const isVideoOff = me?.isVideoOff ?? false;

              if (client && client.connected) {
                client.publish({
                  destination: '/pub/studies/status',
                  body: JSON.stringify({ studyId, isMuted: true, isVideoOff }),
                });
              }
            } else {
              // Sender only
              toast.info('전체 음소거를 실행했습니다.');
            }
            break;
          }
          case 'ADD': {
            // Problem added - trigger refetch
            // data is ProblemStatusResponse with problemId, title, tier, etc.
            if (!data) {
              console.warn('[StudySocket] ADD event received but data is null/undefined');
              break;
            }
            const addedProblemId = data.problemId;
            const problemTitle = data.title || data.externalId || `문제 ${addedProblemId}`;
            const externalId = data.externalId || String(addedProblemId);
            console.log('[StudySocket] Problem added:', addedProblemId, 'Full data:', data);
            window.dispatchEvent(
              new CustomEvent('study-problem-added', {
                detail: { studyId, problem: data },
              }),
            );
            toast.info(`문제가 추가되었습니다: ${externalId}. ${problemTitle}`);
            break;
          }
          case 'REMOVE': {
            // Problem removed - trigger refetch
            // data is ProblemStatusResponse with problemId
            if (!data) {
              console.warn('[StudySocket] REMOVE event received but data is null/undefined');
              break;
            }
            const removedProblemId = data.problemId;
            const problemTitle = data.title || data.externalId || `문제 ${removedProblemId}`;
            const externalId = data.externalId || String(removedProblemId);
            console.log('[StudySocket] Problem removed:', removedProblemId, 'Full data:', data);
            window.dispatchEvent(
              new CustomEvent('study-problem-removed', {
                detail: { studyId, problemId: removedProblemId },
              }),
            );
            toast.info(`문제가 삭제되었습니다: ${externalId}. ${problemTitle}`);
            break;
          }
          case 'CURRICULUM': {
            // Curriculum update - trigger refetch
            console.log('[StudySocket] Curriculum updated');
            window.dispatchEvent(
              new CustomEvent('study-curriculum-updated', {
                detail: { studyId },
              }),
            );
            break;
          }
          case 'VIDEO_TOKEN': {
            // LiveKit token received
            const token = data;
            console.log('[StudySocket] Received VIDEO_TOKEN');
            setVideoToken(token);
            break;
          }
          case 'SOLVED': {
            // Problem Solved - trigger refetch & toast
            const { problemId, userId: solverId, nickname, earnedPoints } = data;
            console.log('[StudySocket] SOLVED event:', data);

            // Refetch curriculum to update status (green check, user count)
            window.dispatchEvent(
              new CustomEvent('study-curriculum-updated', {
                detail: { studyId },
              }),
            );

            // Toast notification
            // If I am the solver, message might be different or handled by API response.
            // But API response covers the submitter. This broadcast covers EVERYONE.
            // Avoid duplicate toast for submitter if API response already toasted?
            // Usually API response handles success toast.
            // But here we can just show generic info.
            if (solverId !== useRoomStore.getState().currentUserId) {
              toast.success(`${nickname}님이 문제를 해결했습니다!`);
            } else {
              // For me, maybe redundant if UI already showed it, but socket is faster/surer.
              // Let's show it or rely on existing success feedback.
              // Existing submit logic shows toast probably.
            }
            break;
          }
          case 'ERROR': {
            // Error from server
            const errorMessage =
              typeof data === 'string' ? data : data?.message || '알 수 없는 오류가 발생했습니다.';
            toast.error(errorMessage);
            break;
          }
        }
      } catch (e) {
        console.error('[StudySocket] Error parsing message', e);
      }
    };

    // currentUserId가 변경될 때마다 private topics 재구독
    currentUserIdRef.current = currentUserId;

    // currentUserId 변경 감지 및 재구독
    const checkAndResubscribe = () => {
      if (currentUserIdRef.current && !privateSubscription) {
        console.log('[StudySocket] currentUserId available, resubscribing to private topics');
        subscribeToPrivateTopics();
      }
    };

    // 주기적으로 확인 (currentUserId가 나중에 설정될 수 있음)
    const resubscribeInterval = setInterval(checkAndResubscribe, 1000);

    return () => {
      console.log('[StudySocket] Hook cleanup triggered');
      clearInterval(resubscribeInterval);
      publicSubscription.unsubscribe();
      curriculumSubscription.unsubscribe();
      if (privateSubscription) privateSubscription.unsubscribe();
      if (videoTokenSubscription) videoTokenSubscription.unsubscribe();

      // 3. Leave Study (Session Exit)
      // Do NOT send explicit LEAVE here.
      // If the component unmounts due to navigation, the Socket Disconnect event
      // will be handled by the backend.
      // If this cleanup runs due to re-render (e.g. router change), sending LEAVE
      // causes the backend to kick the user from LiveKit, resulting in disconnection.
      /*
      if (client && client.connected) {
        console.log('[StudySocket] Hook Cleanup - Sending LEAVE');
        client.publish({ destination: '/pub/studies/leave', body: JSON.stringify({ studyId }) });
      } else {
        console.log('[StudySocket] Hook Cleanup - Client not connected');
      }
      */
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
    setVideoToken,
    currentUserId, // currentUserId를 dependency에 추가하여 변경 시 재실행
  ]);
};
