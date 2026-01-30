'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRoomStore, type Participant } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Crown, Mic, MicOff, VideoOff, User } from 'lucide-react';
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

  // OpenVidu 스트림 관리
  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    // 스트림 생성/제거 이벤트 리스너
    const handleStreamCreated = (event: CustomEvent) => {
      const { subscriber, userId } = event.detail;
      if (userId === participant.id && videoRef.current && subscriber) {
        streamManagerRef.current = subscriber;
        subscriber.addVideoElement(videoRef.current);
      }
    };

    const handleStreamDestroyed = (event: CustomEvent) => {
      const { userId } = event.detail;
      if (userId === participant.id) {
        if (streamManagerRef.current && videoRef.current) {
          streamManagerRef.current.removeVideoElement(videoRef.current);
        }
        streamManagerRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    const handlePublisherCreated = (event: CustomEvent) => {
      const { publisher } = event.detail;
      if (isCurrentUser && videoRef.current && publisher) {
        streamManagerRef.current = publisher;
        publisher.addVideoElement(videoRef.current);
      }
    };

    const handlePublisherDestroyed = () => {
      if (isCurrentUser) {
        if (streamManagerRef.current && videoRef.current) {
          streamManagerRef.current.removeVideoElement(videoRef.current);
        }
        streamManagerRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    // 기존 스트림이 있는지 확인 (이미 생성된 경우)
    const getStreamManager = (window as any).__openviduGetStreamManager as
      | ((userId: number) => StreamManager | null)
      | undefined;

    if (getStreamManager) {
      const existingStreamManager = isCurrentUser
        ? (window as any).__openviduPublisher
        : getStreamManager(participant.id);
      
      if (existingStreamManager && videoRef.current) {
        streamManagerRef.current = existingStreamManager;
        existingStreamManager.addVideoElement(videoRef.current);
      }
    }

    window.addEventListener('openvidu-stream-created', handleStreamCreated as EventListener);
    window.addEventListener('openvidu-stream-destroyed', handleStreamDestroyed as EventListener);
    window.addEventListener('openvidu-publisher-created', handlePublisherCreated as EventListener);
    window.addEventListener('openvidu-publisher-destroyed', handlePublisherDestroyed as EventListener);

    return () => {
      window.removeEventListener('openvidu-stream-created', handleStreamCreated as EventListener);
      window.removeEventListener('openvidu-stream-destroyed', handleStreamDestroyed as EventListener);
      window.removeEventListener('openvidu-publisher-created', handlePublisherCreated as EventListener);
      window.removeEventListener('openvidu-publisher-destroyed', handlePublisherDestroyed as EventListener);
      
      if (streamManagerRef.current && videoRef.current) {
        streamManagerRef.current.removeVideoElement(videoRef.current);
      }
    };
  }, [participant.id, isCurrentUser]);

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
        'relative flex h-24 w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg bg-muted transition-all hover:ring-2 hover:ring-primary/50',
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
            {/* 비디오가 없을 때 플레이스홀더 */}
            {!streamManagerRef.current && (
              <div className="absolute flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                <User className="h-8 w-8 text-muted-foreground/50" />
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
