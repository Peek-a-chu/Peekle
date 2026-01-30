'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRoomStore, type Participant } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Crown, Mic, MicOff, VideoOff, User, Loader2 } from 'lucide-react';
import type { StreamManager } from 'openvidu-browser';

interface CCVideoTileProps {
  participant: Participant;
  isCurrentUser?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CCVideoTile({
  participant,
  isCurrentUser = false,
  onClick,
  className,
}: CCVideoTileProps) {
  const viewingUser = useRoomStore((state) => state.viewingUser);
  const isBeingViewed = viewingUser?.id === participant.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamManagerRef = useRef<StreamManager | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  // OpenVidu 스트림 관리
  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    // 스트림 생성/제거 이벤트 리스너
    const handleStreamCreated = (event: CustomEvent) => {
      const { subscriber, userId } = event.detail;
      if (userId === participant.id && videoRef.current && subscriber) {
        setIsStreamLoading(false);
        streamManagerRef.current = subscriber;
        subscriber.addVideoElement(videoRef.current);
      }
    };

    const handleStreamDestroyed = (event: CustomEvent) => {
      const { userId } = event.detail;
      if (userId === participant.id) {
        streamManagerRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    const handlePublisherCreated = (event: CustomEvent) => {
      const { publisher } = event.detail;
      if (isCurrentUser && videoRef.current && publisher) {
        setIsStreamLoading(false);
        streamManagerRef.current = publisher;
        publisher.addVideoElement(videoRef.current);
      }
    };

    const handlePublisherDestroyed = () => {
      if (isCurrentUser) {
        streamManagerRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    const handlePublisherVideoChanged = (event: CustomEvent) => {
      const { publisher, videoActive } = event.detail;
      if (isCurrentUser && videoRef.current && publisher) {
        if (videoActive) {
          // 비디오가 켜졌을 때 - video element를 완전히 정리한 후 다시 추가
          const videoElement = videoRef.current;
          if (videoElement) {
            setIsStreamLoading(true);
            // 기존 스트림 완전히 제거
            videoElement.srcObject = null;
            videoElement.pause();
            videoElement.load(); // video element 리셋
            
            // OpenVidu 스트림이 준비될 때까지 대기
            let retryCount = 0;
            const maxRetries = 20;
            
            const checkAndAdd = () => {
              if (videoElement && publisher && publisher.stream.videoActive) {
                try {
                  setIsStreamLoading(false);
                  streamManagerRef.current = publisher;
                  publisher.addVideoElement(videoElement);
                  // video element가 재생되도록 강제
                  videoElement.play().catch((err) => {
                    console.warn('[CCVideoTile] Video play failed:', err);
                  });
                } catch (error) {
                  console.error('[CCVideoTile] Failed to add video element:', error);
                  if (retryCount < maxRetries) {
                    retryCount++;
                    retryTimeoutRef.current = setTimeout(checkAndAdd, 100);
                  } else {
                    setIsStreamLoading(false);
                  }
                }
              } else {
                // 아직 준비되지 않았으면 재시도
                if (retryCount < maxRetries) {
                  retryCount++;
                  retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
                } else {
                  setIsStreamLoading(false);
                }
              }
            };
            
            // 즉시 시도 후, 실패하면 재시도
            retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
          }
        } else {
          // 비디오가 꺼졌을 때
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
            videoRef.current.load();
          }
          streamManagerRef.current = null;
        }
      }
    };

    // 기존 스트림이 있는지 확인 (이미 생성된 경우)
    const getStreamManager = (window as any).__openviduGetStreamManager as
      | ((userId: number) => StreamManager | null)
      | undefined;

    const updateVideoElement = () => {
      if (!videoRef.current) return;

      if (isCurrentUser) {
        // 현재 사용자의 경우 publisher 사용
        const publisher = (window as any).__openviduPublisher as StreamManager | undefined;
        if (publisher && !participant.isVideoOff) {
          // 비디오가 켜져 있고 publisher가 있으면 비디오 요소에 추가
          if (!streamManagerRef.current) {
            setIsStreamLoading(true);
          }
          streamManagerRef.current = publisher;
          publisher.addVideoElement(videoRef.current);
          // 스트림이 추가되면 로딩 상태 해제
          setTimeout(() => {
            if (streamManagerRef.current) {
              setIsStreamLoading(false);
            }
          }, 100);
        } else {
          // 비디오가 꺼져 있으면 제거
          setIsStreamLoading(false);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          streamManagerRef.current = null;
        }
      } else {
        // 다른 사용자의 경우 subscriber 사용
        if (getStreamManager) {
          const subscriber = getStreamManager(participant.id);
          if (subscriber && !participant.isVideoOff) {
            if (!streamManagerRef.current) {
              setIsStreamLoading(true);
            }
            streamManagerRef.current = subscriber;
            subscriber.addVideoElement(videoRef.current);
            // 스트림이 추가되면 로딩 상태 해제
            setTimeout(() => {
              if (streamManagerRef.current) {
                setIsStreamLoading(false);
              }
            }, 100);
          } else {
            setIsStreamLoading(false);
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            streamManagerRef.current = null;
          }
        }
      }
    };

    // 초기 설정
    updateVideoElement();

    window.addEventListener('openvidu-stream-created', handleStreamCreated as EventListener);
    window.addEventListener('openvidu-stream-destroyed', handleStreamDestroyed as EventListener);
    window.addEventListener('openvidu-publisher-created', handlePublisherCreated as EventListener);
    window.addEventListener('openvidu-publisher-destroyed', handlePublisherDestroyed as EventListener);
    window.addEventListener('openvidu-publisher-video-changed', handlePublisherVideoChanged as EventListener);

    return () => {
      window.removeEventListener('openvidu-stream-created', handleStreamCreated as EventListener);
      window.removeEventListener('openvidu-stream-destroyed', handleStreamDestroyed as EventListener);
      window.removeEventListener('openvidu-publisher-created', handlePublisherCreated as EventListener);
      window.removeEventListener('openvidu-publisher-destroyed', handlePublisherDestroyed as EventListener);
      window.removeEventListener('openvidu-publisher-video-changed', handlePublisherVideoChanged as EventListener);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamManagerRef.current = null;
    };
  }, [participant.id, isCurrentUser]);

  // participant.isVideoOff 변경 시 비디오 요소 업데이트
  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;

    if (isCurrentUser) {
      // 현재 사용자의 경우 publisher 사용
      const publisher = (window as any).__openviduPublisher as StreamManager | undefined;
      if (publisher && !participant.isVideoOff) {
        // 비디오가 켜져 있고 publisher가 있으면 비디오 요소에 추가
        setIsStreamLoading(true);
        // 먼저 기존 연결을 완전히 정리
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.load(); // video element 리셋
        
        // OpenVidu 스트림이 준비될 때까지 대기
        let retryCount = 0;
        const maxRetries = 20;
        
        const checkAndAdd = () => {
          if (videoElement && publisher && publisher.stream.videoActive) {
            try {
              setIsStreamLoading(false);
              streamManagerRef.current = publisher;
              publisher.addVideoElement(videoElement);
              // video element가 재생되도록 강제
              videoElement.play().catch((err) => {
                console.warn('[CCVideoTile] Video play failed:', err);
              });
            } catch (error) {
              console.error('[CCVideoTile] Failed to add video element:', error);
              // 재시도
              if (retryCount < maxRetries) {
                retryCount++;
                retryTimeoutRef.current = setTimeout(checkAndAdd, 100);
              } else {
                setIsStreamLoading(false);
              }
            }
          } else {
            // 아직 준비되지 않았으면 재시도 (최대 1초)
            if (retryCount < maxRetries) {
              retryCount++;
              retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
            } else {
              setIsStreamLoading(false);
            }
          }
        };
        
        retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
        
        return () => {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
        };
      } else {
        // 비디오가 꺼져 있으면 제거
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.load();
        streamManagerRef.current = null;
      }
    } else {
      // 다른 사용자의 경우 subscriber 사용
      const getStreamManager = (window as any).__openviduGetStreamManager as
        | ((userId: number) => StreamManager | null)
        | undefined;
      
      if (getStreamManager) {
        const subscriber = getStreamManager(participant.id);
        if (subscriber && !participant.isVideoOff) {
          // 먼저 기존 연결을 완전히 정리
          setIsStreamLoading(true);
          videoElement.pause();
          videoElement.srcObject = null;
          videoElement.load();
          
          // OpenVidu 스트림이 준비될 때까지 대기
          let retryCount = 0;
          const maxRetries = 20;
          
          const checkAndAdd = () => {
            if (videoElement && subscriber && subscriber.stream.videoActive) {
              try {
                setIsStreamLoading(false);
                streamManagerRef.current = subscriber;
                subscriber.addVideoElement(videoElement);
                videoElement.play().catch((err) => {
                  console.warn('[CCVideoTile] Video play failed:', err);
                });
              } catch (error) {
                console.error('[CCVideoTile] Failed to add video element:', error);
                if (retryCount < maxRetries) {
                  retryCount++;
                  retryTimeoutRef.current = setTimeout(checkAndAdd, 100);
                } else {
                  setIsStreamLoading(false);
                }
              }
            } else {
              if (retryCount < maxRetries) {
                retryCount++;
                retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
              } else {
                setIsStreamLoading(false);
              }
            }
          };
          
          retryTimeoutRef.current = setTimeout(checkAndAdd, 50);
          
          return () => {
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
          };
        } else {
          videoElement.pause();
          videoElement.srcObject = null;
          videoElement.load();
          streamManagerRef.current = null;
        }
      }
    }
  }, [participant.isVideoOff, participant.id, isCurrentUser]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={cn(
        'relative flex h-40 w-52 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg bg-muted transition-all hover:ring-2 hover:ring-primary/50 ',
        isBeingViewed && 'ring-2 ring-yellow-400',
        !participant.isOnline && 'opacity-60',
        className,
      )}
    >
      {/* Video Area */}
      <div className="relative flex flex-1 items-center justify-center bg-muted-foreground/10 overflow-hidden">
        {participant.isVideoOff ? (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted-foreground/20">
            {participant.profileImage ? (
              <Image
                src={participant.profileImage}
                alt={participant.nickname}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        ) : (
          <>
            {/* 실제 비디오 스트림 */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
              style={{ display: streamManagerRef.current ? 'block' : 'none' }}
            />
            {/* 비디오가 없을 때 플레이스홀더 또는 로딩 스피너 */}
            {!streamManagerRef.current && (
              <div className="absolute flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                {isStreamLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">연결 중...</span>
                  </div>
                ) : (
                  <User className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
            )}
          </>
        )}

        {/* Video Off Indicator */}
        {participant.isVideoOff && (
          <div className="absolute right-1 top-1">
            <VideoOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-between bg-card/90 px-2 py-1">
        <div className="flex items-center gap-1 truncate">
          <span className="truncate text-xs font-medium">{participant.nickname}</span>
          {isCurrentUser && <span className="text-xs text-muted-foreground">(나)</span>}
        </div>

        <div className="flex items-center gap-1">
          {participant.isOwner && <Crown className="h-3 w-3 text-yellow-500" aria-label="방장" />}
          {participant.isMuted ? (
            <MicOff className="h-3 w-3 text-destructive" aria-label="음소거" />
          ) : (
            <Mic className="h-3 w-3 text-muted-foreground" aria-label="마이크 켜짐" />
          )}
        </div>
      </div>

      {/* Online Status Indicator */}
      <div
        className={cn(
          'absolute left-1 top-1 h-2 w-2 rounded-full',
          participant.isOnline ? 'bg-green-500' : 'bg-gray-400',
        )}
        aria-label={participant.isOnline ? '온라인' : '오프라인'}
      />
    </div>
  );
}
