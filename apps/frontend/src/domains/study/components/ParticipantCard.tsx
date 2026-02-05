'use client';

import { useState, useRef, useEffect } from 'react';
import { Participant } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Mic,
  MicOff,
  Video,
  VideoOff,
  User,
  Crown,
  FileCode2,
  LogOut,
  Ban,
  UserCircle,
} from 'lucide-react';
import { UserIcon } from '@/components/UserIcon';

interface ParticipantCardProps {
  participant: Participant;
  isMe: boolean;
  isRoomOwner: boolean;
  onKick?: (p: Participant) => void;
  onDelegate?: (p: Participant) => void;
  onViewCode?: (p: Participant) => void;
  onMuteUser?: (p: Participant) => void;
  onVideoOffUser?: (p: Participant) => void;
  onViewProfile?: (p: Participant) => void;
}

export function ParticipantCard({
  participant,
  isMe,
  isRoomOwner,
  onKick,
  onDelegate,
  onViewCode,
  onMuteUser,
  onVideoOffUser,
  onViewProfile,
}: ParticipantCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setMenuPosition(null);
      }
    };
    // Include context menu to close on outside click
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Don't show menu for myself if not intended (though usually "Profile" is always valid)
    // Based on requirements, "Me" doesn't have right-click actions listed in the "User -> User" section directly,
    // but "Me -> Others".
    // "Online (Me)" usually has no actions or just profile.
    // Let's allow menu for everyone, but filter items.
    // If no items, don't open.
    if (!hasAnyAction) return;

    // Simple positioning: near mouse but ensure visibility (simplified)
    // Actually, let's just open the dropdown menu if using 3-dot logic,
    // OR use fixed position for context menu.
    // For consistency with specific request "Right Click", let's try fixed.
    // But mixed approaches are buggy.
    // Let's simulate clicking the 3-dot button if it exists, or toggle state.
    setIsMenuOpen(true);
    // Ideally we use mouse position, but to keep simple with existing CSS structure (absolute to parent),
    // we might just let it pop from the right side.
    // BUT the requirement says "Right click".
    // If I use `fixed` position for menu, it breaks out of overflow containers which is good.
  };

  const isOnline = participant.isOnline;

  // Actions Availability
  // 1. Owner Actions (on Others)
  const canOwnerActions = isRoomOwner && !isMe;
  // 2. View Code (Online Only, Not Me)
  const canViewCode = isOnline && !isMe;
  // 3. View Profile (Everyone except me)
  const canViewProfile = !isMe;

  const hasAnyAction = canOwnerActions || canViewCode || canViewProfile;

  return (
    <div
      ref={cardRef}
      onContextMenu={handleContextMenu}
      className={cn(
        'group relative flex items-center justify-between rounded-xl border p-3 shadow-sm transition-all duration-200',
        isOnline
          ? 'bg-card border-border hover:border-pink-300 hover:shadow-md hover:bg-pink-50/10'
          : 'bg-muted/10 border-transparent opacity-80 grayscale-[0.3]',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Profile & Status */}
        <div className="relative shrink-0">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/50 bg-muted">
            <UserIcon
              src={participant.profileImage}
              nickname={participant.nickname}
              size={40}
              className="w-full h-full"
            />
          </div>

          {/* Status Dot */}
          <div
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ring-1 ring-background',
              isOnline ? 'bg-green-500' : 'bg-slate-400',
            )}
            title={isOnline ? '온라인' : '오프라인'}
          />
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'truncate font-bold text-sm',
                isMe ? 'text-foreground' : 'text-foreground/90',
              )}
            >
              {participant.nickname}
            </span>
            {isMe && <span className="text-[10px] text-muted-foreground font-medium">(나)</span>}
            {participant.isOwner && <span title="방장">👑</span>}
          </div>
        </div>
      </div>

      {/* Status Icons & Menu */}
      <div className="flex items-center gap-1.5">
        {/* Status Icons (Online only) - Always visible if condition meets */}
        {isOnline && (
          <div className="flex items-center gap-2 mr-1">
            {participant.isMuted && <MicOff className="h-4 w-4 text-red-500 stroke-[2.5px]" />}
            {participant.isVideoOff && <VideoOff className="h-4 w-4 text-red-500 stroke-[2.5px]" />}
          </div>
        )}

        {/* Menu Trigger */}
        {hasAnyAction && (
          <div className="relative flex items-center" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
              data-state={isMenuOpen ? 'open' : 'closed'}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="메뉴"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95">
                <div className="flex flex-col py-1">
                  {/* 1. Owner Actions */}
                  {canOwnerActions && (
                    <>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                        onClick={() => onMuteUser?.(participant)}
                      >
                        <MicOff className="h-3.5 w-3.5" />
                        마이크 끄기
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                        onClick={() => onVideoOffUser?.(participant)}
                      >
                        <VideoOff className="h-3.5 w-3.5" />
                        카메라 끄기
                      </button>
                    </>
                  )}

                  {/* 2. Common Online Actions */}
                  {canViewCode && (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                      onClick={() => onViewCode?.(participant)}
                    >
                      <FileCode2 className="h-3.5 w-3.5 text-blue-500" />
                      실시간 코드 보기
                    </button>
                  )}

                  {/* 3. Owner Critical Actions */}
                  {canOwnerActions && (
                    <>
                      <div className="my-1 h-px bg-border" />
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                        onClick={() => onDelegate?.(participant)}
                      >
                        <Crown className="h-3.5 w-3.5 text-yellow-600" />
                        방장 넘기기
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-red-500 hover:text-red-600 text-left"
                        onClick={() => onKick?.(participant)}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        강퇴하기
                      </button>
                    </>
                  )}

                  {/* 4. Profile (Always) */}
                  <div className="my-1 h-px bg-border" />
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground text-left"
                    onClick={() => onViewProfile?.(participant)}
                  >
                    <UserCircle className="h-3.5 w-3.5" />
                    프로필 보기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
