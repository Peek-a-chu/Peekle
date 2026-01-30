'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { OpenVidu, Session, Publisher, Subscriber, StreamManager } from 'openvidu-browser';
import { useRoomStore, type Participant } from './useRoomStore';
import { toast } from 'sonner';

// OpenVidu 서버 URL 가져오기
function getOpenViduUrl(): string {
  // 환경 변수로 직접 OpenVidu URL 설정 가능
  if (process.env.NEXT_PUBLIC_OPENVIDU_URL) {
    const url = process.env.NEXT_PUBLIC_OPENVIDU_URL;
    console.log('[OpenVidu] Server URL from NEXT_PUBLIC_OPENVIDU_URL:', url);
    return url;
  }
  
  // 로컬 실행 시 직접 포트로 접근 (nginx 프록시 없이)
  // Docker 실행 시에는 nginx 프록시를 통해 접근
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://localhost';
  
  // localhost인 경우 직접 포트로 접근 (로컬 실행)
  if (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
    const openViduUrl = 'https://localhost:8443';
    console.log('[OpenVidu] Server URL (local):', openViduUrl);
    return openViduUrl;
  }
  
  // Docker 환경에서는 nginx 프록시를 통해 접근
  const openViduUrl = socketUrl.replace(/\/$/, '') + '/openvidu';
  console.log('[OpenVidu] Server URL (via nginx):', openViduUrl, 'from NEXT_PUBLIC_SOCKET_URL:', socketUrl);
  return openViduUrl;
}

interface UseOpenViduReturn {
  session: Session | null;
  publisher: Publisher | null;
  isConnected: boolean;
  isConnecting: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

export function useOpenVidu(): UseOpenViduReturn {
  const videoToken = useRoomStore((state) => state.videoToken);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const participants = useRoomStore((state) => state.participants);
  const updateParticipant = useRoomStore((state) => state.updateParticipant);
  const setParticipants = useRoomStore((state) => state.setParticipants);

  const OVRef = useRef<OpenVidu | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const publisherRef = useRef<Publisher | null>(null);
  const streamManagersRef = useRef<Map<number, StreamManager>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // connection data에서 userId 추출 헬퍼 함수
  const extractUserId = useCallback((connectionData: string | undefined): number | null => {
    if (!connectionData) return null;

    try {
      // JSON 형식인 경우
      if (connectionData.startsWith('{')) {
        const data = JSON.parse(connectionData);
        return data.userId || null;
      }
      // Map.toString() 형식인 경우: "{userId=123}"
      const match = connectionData.match(/userId[=:]\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    } catch (e) {
      console.warn('[OpenVidu] Failed to parse connection data:', connectionData, e);
    }
    return null;
  }, []);

  // OpenVidu 초기화 및 연결
  useEffect(() => {
    if (!videoToken || !currentUserId) {
      console.log('[OpenVidu] Skipping initialization - missing token or userId', {
        hasToken: !!videoToken,
        currentUserId,
      });
      return;
    }

    const openViduUrl = getOpenViduUrl();
    console.log('[OpenVidu] Initializing with URL:', openViduUrl);

    let OV: OpenVidu;
    try {
      // OpenVidu 2.32+ 버전에서는 생성자가 인자를 받지 않음
      OV = new OpenVidu();
      OVRef.current = OV;
      console.log('[OpenVidu] OpenVidu client initialized successfully with URL:', openViduUrl);
    } catch (error) {
      console.error('[OpenVidu] Failed to initialize OpenVidu client:', error);
      toast.error('OpenVidu 클라이언트 초기화에 실패했습니다: ' + (error as Error).message);
      return;
    }

    // initSession()은 인자를 받지 않음 (OpenVidu 2.32+)
    const session = OV.initSession();
    sessionRef.current = session;

    // 원격 스트림 생성 이벤트
    session.on('streamCreated', (event) => {
      console.log('[OpenVidu] Stream created:', event.stream.streamId);
      const subscriber = session.subscribe(event.stream, undefined);

      // 스트림의 connection data에서 userId 추출
      const connectionData = event.stream.connection?.data;
      const userId = extractUserId(connectionData);

      if (userId) {
        streamManagersRef.current.set(userId, subscriber);
        // 참가자 상태 업데이트 (비디오/오디오 상태는 스트림에서 가져옴)
        updateParticipant(userId, {
          isMuted: !subscriber.stream.hasAudio,
          isVideoOff: !subscriber.stream.hasVideo,
        });
      }

      // DOM에 비디오 요소 추가는 CCVideoTile에서 처리
      // 여기서는 이벤트를 발생시켜 컴포넌트에 알림
      window.dispatchEvent(
        new CustomEvent('openvidu-stream-created', {
          detail: { subscriber, userId },
        }),
      );
    });

    // 원격 스트림 제거 이벤트
    session.on('streamDestroyed', (event) => {
      console.log('[OpenVidu] Stream destroyed:', event.stream.streamId);

      const connectionData = event.stream.connection?.data;
      const userId = extractUserId(connectionData);

      if (userId) {
        streamManagersRef.current.delete(userId);
        window.dispatchEvent(
          new CustomEvent('openvidu-stream-destroyed', {
            detail: { userId },
          }),
        );
      }
    });

    // 예외 처리
    session.on('exception', (exception) => {
      console.error('[OpenVidu] Exception:', exception);
      toast.error('비디오 연결 중 오류가 발생했습니다.');
    });

    // 세션 연결
    console.log('[OpenVidu] Connecting session with token');
    setIsConnecting(true);

    session
      .connect(videoToken, { clientData: JSON.stringify({ userId: currentUserId }) })
      .then(() => {
        setIsConnecting(false);
        console.log('[OpenVidu] Session connected');
        setIsConnected(true);

        // 로컬 스트림 발행
        const publisher = OV.initPublisher(undefined, {
          audioSource: undefined, // 기본 마이크
          videoSource: undefined, // 기본 카메라
          publishAudio: true,
          publishVideo: true,
          resolution: '640x480',
          frameRate: 30,
          insertMode: 'APPEND',
          mirror: true,
        });

        publisherRef.current = publisher;

        // 발행자를 전역에 등록 (CCVideoTile에서 접근 가능하도록)
        (window as any).__openviduPublisher = publisher;

        // 발행자 이벤트
        publisher.on('streamCreated', () => {
          console.log('[OpenVidu] Publisher stream created');
          window.dispatchEvent(
            new CustomEvent('openvidu-publisher-created', {
              detail: { publisher },
            }),
          );
        });

        publisher.on('streamDestroyed', () => {
          console.log('[OpenVidu] Publisher stream destroyed');
          delete (window as any).__openviduPublisher;
          window.dispatchEvent(
            new CustomEvent('openvidu-publisher-destroyed', {
              detail: {},
            }),
          );
        });

        // 스트림 속성 변경 이벤트 (비디오/오디오 토글 시 발생)
        publisher.on('streamPropertyChanged', (event: any) => {
          console.log('[OpenVidu] Publisher stream property changed:', event.changedProperty, event.newValue);
          if (event.changedProperty === 'videoActive') {
            window.dispatchEvent(
              new CustomEvent('openvidu-publisher-video-changed', {
                detail: { publisher, videoActive: event.newValue },
              }),
            );
          }
        });

        session.publish(publisher);
        console.log('[OpenVidu] Publisher published');

        // 즉시 이벤트 발생 (이미 생성된 경우)
        window.dispatchEvent(
          new CustomEvent('openvidu-publisher-created', {
            detail: { publisher },
          }),
        );
      })
      .catch((error) => {
        console.error('[OpenVidu] Connection error:', error);
        console.error('[OpenVidu] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          openViduUrl,
          hasToken: !!videoToken,
        });

        let errorMessage = '비디오 연결에 실패했습니다.';
        if (error.message?.includes('알려진 호스트') || error.message?.includes('unknown host')) {
          errorMessage = 'OpenVidu 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
        } else if (error.message) {
          errorMessage = `비디오 연결 실패: ${error.message}`;
        }

        toast.error(errorMessage);
        setIsConnected(false);
        setIsConnecting(false);
      });

    // 정리 함수
    return () => {
      console.log('[OpenVidu] Cleaning up');
      delete (window as any).__openviduPublisher;
      if (publisherRef.current) {
        sessionRef.current?.unpublish(publisherRef.current);
        publisherRef.current = null;
      }
      if (sessionRef.current) {
        sessionRef.current.disconnect();
        sessionRef.current = null;
      }
      streamManagersRef.current.clear();
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [videoToken, currentUserId, updateParticipant, extractUserId]);

  // 오디오 토글
  const toggleAudio = useCallback(() => {
    if (publisherRef.current) {
      const isAudioEnabled = publisherRef.current.stream.audioActive;
      publisherRef.current.publishAudio(!isAudioEnabled);

      if (currentUserId) {
        updateParticipant(currentUserId, { isMuted: isAudioEnabled });
      }
    }
  }, [currentUserId, updateParticipant]);

  // 비디오 토글
  const toggleVideo = useCallback(() => {
    if (publisherRef.current) {
      const isVideoEnabled = publisherRef.current.stream.videoActive;
      publisherRef.current.publishVideo(!isVideoEnabled);

      if (currentUserId) {
        updateParticipant(currentUserId, { isVideoOff: isVideoEnabled });
      }

      // streamPropertyChanged 이벤트 핸들러에서 이벤트를 발생시키므로
      // 여기서는 즉시 발생시키지 않음 (스트림이 준비된 후에만 이벤트 발생)
    }
  }, [currentUserId, updateParticipant]);

  // 특정 사용자의 StreamManager 가져오기
  const getStreamManager = useCallback((userId: number): StreamManager | null => {
    if (userId === currentUserId) {
      return publisherRef.current;
    }
    return streamManagersRef.current.get(userId) || null;
  }, [currentUserId]);

  // 외부에서 사용할 수 있도록 전역 함수로 등록
  useEffect(() => {
    (window as any).__openviduGetStreamManager = getStreamManager;
    (window as any).__openviduToggleAudio = toggleAudio;
    (window as any).__openviduToggleVideo = toggleVideo;
    return () => {
      delete (window as any).__openviduGetStreamManager;
      delete (window as any).__openviduToggleAudio;
      delete (window as any).__openviduToggleVideo;
    };
  }, [getStreamManager, toggleAudio, toggleVideo]);

  return {
    session: sessionRef.current,
    publisher: publisherRef.current,
    isConnected,
    isConnecting,
    toggleAudio,
    toggleVideo,
  };
}
