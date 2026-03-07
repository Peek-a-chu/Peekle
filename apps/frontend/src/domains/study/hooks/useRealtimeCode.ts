import { useState, useEffect, useRef } from 'react';
import { Participant, useRoomStore } from './useRoomStore';
import { useSocket } from './useSocket';

export function useRealtimeCode(viewingUser: Participant | null) {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python'); // Default
  const [problemTitle, setProblemTitle] = useState<string>('');
  const [problemExternalId, setProblemExternalId] = useState<string>('');
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const lastEventTsRef = useRef(0);
  const latestCodeRef = useRef('');

  // Ensure we have a socket connection
  const socket = useSocket(roomId, currentUserId);

  useEffect(() => {
    latestCodeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!socket || !viewingUser || !roomId) {
      setCode('');
      setLanguage('python');
      setProblemTitle('');
      setProblemExternalId('');
      lastEventTsRef.current = 0;
      return;
    }

    // Subscribe to the target user's IDE topic
    // Topic: /topic/studies/rooms/{id}/ide/{userId}
    const ideTopic = `/topic/studies/rooms/${roomId}/ide/${viewingUser.id}`;

    // Subscribe to snapshot response topic
    // Topic: /topic/studies/rooms/{id}/ide/{myUserId}/snapshot
    const snapshotTopic = `/topic/studies/rooms/${roomId}/ide/${currentUserId}/snapshot`;

    const ideSubscription = socket.subscribe(ideTopic, (message) => {
      try {
        const payload = JSON.parse(message.body);
        const type = payload?.type;
        const data = payload?.data ?? payload;
        const parsedTs = Number(data?.eventTs);
        const eventTs = Number.isFinite(parsedTs) ? parsedTs : null;

        if (eventTs !== null && eventTs < lastEventTsRef.current) {
          return;
        }
        if (eventTs !== null) {
          lastEventTsRef.current = eventTs;
        }

        const nextLang =
          typeof data?.lang === 'string'
            ? data.lang
            : typeof data?.language === 'string'
              ? data.language
              : null;
        const nextTitle = typeof data?.problemTitle === 'string' ? data.problemTitle : null;
        const hasExternalId =
          data && Object.prototype.hasOwnProperty.call(data, 'externalId');
        const nextExternalId =
          typeof data?.externalId === 'string'
            ? data.externalId
            : typeof data?.externalId === 'number'
              ? String(data.externalId)
              : '';

        if (nextTitle !== null) {
          setProblemTitle(nextTitle);
        }
        if (hasExternalId) {
          setProblemExternalId(nextExternalId.trim());
        }

        if (type === 'IDE_LANGUAGE') {
          if (nextLang) {
            setLanguage(nextLang);
          }
          return;
        }

        if (type === 'IDE' || type === 'IDE_SNAPSHOT' || typeof data?.code === 'string') {
          if (nextLang) {
            setLanguage(nextLang);
          }

          if (typeof data?.code === 'string') {
            // Prevent accidental blank overwrite from non-snapshot stream when we
            // already hold valid code.
            if (data.code.length === 0 && latestCodeRef.current.length > 0 && type !== 'IDE_SNAPSHOT') {
            } else {
              setCode(data.code);
              latestCodeRef.current = data.code;
            }
          }
          return;
        }

        // Fallback for unwrapped or custom payloads that only carry language.
        if (nextLang) {
          setLanguage(nextLang);
        }
      } catch (e) {
        console.error('Error parsing IDE message', e);
      }
    });

    const snapshotSubscription = socket.subscribe(snapshotTopic, (message) => {
      try {
        const payload = JSON.parse(message.body);
        const type = payload?.type;
        const data = payload?.data ?? payload;
        const parsedTs = Number(data?.eventTs);
        const eventTs = Number.isFinite(parsedTs) ? parsedTs : null;

        if (eventTs !== null && eventTs < lastEventTsRef.current) {
          return;
        }
        if (eventTs !== null) {
          lastEventTsRef.current = eventTs;
        }

        if (type === 'IDE_SNAPSHOT' || typeof data?.code === 'string') {
          const snapshotLang =
            typeof data?.lang === 'string'
              ? data.lang
              : typeof data?.language === 'string'
                ? data.language
                : null;
          if (typeof data?.code === 'string') {
            setCode(data.code);
            latestCodeRef.current = data.code;
          }
          if (typeof data?.lang === 'string') {
            setLanguage(data.lang);
          } else if (typeof data?.language === 'string') {
            setLanguage(data.language);
          }
          if (typeof data?.problemTitle === 'string') {
            setProblemTitle(data.problemTitle);
          }
          if (data && Object.prototype.hasOwnProperty.call(data, 'externalId')) {
            const nextExternalId =
              typeof data?.externalId === 'string'
                ? data.externalId.trim()
                : typeof data?.externalId === 'number'
                  ? String(data.externalId)
                  : '';
            setProblemExternalId(nextExternalId);
          }
        }
      } catch (e) {
        console.error('Error parsing IDE snapshot message', e);
      }
    });

    // Request initial snapshot of the user's code
    socket.publish({
      destination: '/pub/ide/request-snapshot',
      body: JSON.stringify({ targetUserId: viewingUser.id }),
    });

    return () => {
      ideSubscription.unsubscribe();
      snapshotSubscription.unsubscribe();
    };
  }, [socket, viewingUser, roomId, currentUserId]);

  return { code, language, problemTitle, problemExternalId };
}
