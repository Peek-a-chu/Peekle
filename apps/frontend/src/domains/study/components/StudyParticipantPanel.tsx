'use client';

import { useState } from 'react';
import { useRoomStore, Participant, selectIsOwner } from '@/domains/study/hooks/useRoomStore';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VolumeX, Search } from 'lucide-react';
import { ParticipantCard } from './ParticipantCard';
import { KickConfirmModal } from './KickConfirmModal';
import { CCDelegateConfirmModal } from './CCDelegateConfirmModal';
import { CCUserProfileModal } from '@/domains/profile/components/CCUserProfileModal';
import { toast } from 'sonner';
import { useSocketContext } from '../context/SocketContext';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';

export function StudyParticipantPanel() {
  const participants = useRoomStore((state) => state.participants);
  const roomId = useRoomStore((state) => state.roomId);
  const { user } = useAuthStore();
  const { client } = useSocketContext();
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);

  const { kickUser, delegateOwner, muteAll } = useStudySocketActions();

  // My ID from Auth Store
  const myId = user?.id ? Number(user.id) : -1;

  // Find if I am owner
  const isOwner = useRoomStore(selectIsOwner);

  const [search, setSearch] = useState('');
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Participant | null>(null);
  const [profileTarget, setProfileTarget] = useState<Participant | null>(null);

  // Filter & Sort
  const filtered = participants.filter((p) =>
    p.nickname.toLowerCase().includes(search.toLowerCase()),
  );

  const onlineParticipants = filtered.filter((p) => p.isOnline);
  const offlineParticipants = filtered.filter((p) => !p.isOnline);

  const handleKick = () => {
    if (!kickTarget) return;
    try {
      kickUser(kickTarget.id);
      toast.info(`${kickTarget.nickname}님을 강퇴 요청을 전송했습니다.`);
      setKickTarget(null);
    } catch {
      toast.error('강퇴 요청 실패');
    }
  };

  const handleDelegate = () => {
    if (!delegateTarget) return;
    try {
      delegateOwner(delegateTarget.id);
      toast.info('방장 권한 위임 요청을 전송했습니다.');
      setDelegateTarget(null);
    } catch {
      toast.error('방장 위임 요청 실패');
    }
  };

  const handleMuteAll = () => {
    muteAll();
    // toast handled in action or socket listener? Listener handles "Success/Warning". Action just sends.
    // We can show toast here for "Request Sent" if we want, but listener 'MUTE_ALL' will confirm it.
    // The previous code showed "Request Sent". Let's keep minimal or let listener handle it.
    // The listener only toasts "전체 음소거를 실행했습니다" for the sender. So we can remove duplicate toast here if we want.
    // But removing toast here might make it feel unresponsive if socket is slow.
    // However, the action is void.
  };

  const handleMuteUser = (p: Participant) => {
    // TODO: Implement individual mute
    toast.info(`${p.nickname}님의 마이크 끄기를 요청했습니다. (준비중)`);
  };

  const handleVideoOffUser = (p: Participant) => {
    // TODO: Implement individual video off
    toast.info(`${p.nickname}님의 카메라 끄기를 요청했습니다. (준비중)`);
  };

  const handleViewProfile = (p: Participant) => {
    setProfileTarget(p);
  };

  return (
    <div className="flex flex-col h-full bg-background relative select-none">
      <div className="p-4 pb-2 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="참여자 검색"
            className="pl-9 h-10 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:border-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Mute All Button (Owner Only) */}
        {isOwner && (
          <Button
            variant="outline"
            className="w-full text-foreground hover:bg-secondary border-dashed border-border h-9 text-xs"
            onClick={handleMuteAll}
          >
            <VolumeX className="mr-2 h-3.5 w-3.5" />
            전체 음소거
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-6">
        {/* Online Section */}
        <div>
          <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full border border-green-200 bg-green-500 ring-4 ring-green-500/10" />
            온라인 ({onlineParticipants.length})
          </div>
          <div className="space-y-2.5">
            {onlineParticipants.map((p) => (
              <ParticipantCard
                key={p.id}
                participant={p}
                isMe={p.id === myId}
                isRoomOwner={isOwner}
                onKick={setKickTarget}
                onDelegate={setDelegateTarget}
                onViewCode={() => viewRealtimeCode(p)}
                onMuteUser={handleMuteUser}
                onVideoOffUser={handleVideoOffUser}
                onViewProfile={handleViewProfile}
              />
            ))}
            {onlineParticipants.length === 0 && (
              <div className="text-sm text-center text-muted-foreground py-8">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Offline Section */}
        {offlineParticipants.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider border-t border-border/50 pt-4 mt-2">
              <div className="w-2 h-2 rounded-full border border-slate-200 bg-slate-300 ring-4 ring-slate-200/50" />
              오프라인 ({offlineParticipants.length})
            </div>
            <div className="space-y-2.5">
              {offlineParticipants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  isMe={false}
                  isRoomOwner={isOwner}
                  onKick={setKickTarget}
                  onDelegate={setDelegateTarget}
                  onViewCode={() => { }} // Disabled for offline
                  onViewProfile={handleViewProfile}
                // Mute/Video actions usually disabled or hidden for offline
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {kickTarget && (
        <KickConfirmModal
          isOpen={!!kickTarget}
          onClose={() => setKickTarget(null)}
          onConfirm={handleKick}
          userName={kickTarget.nickname}
        />
      )}
      {delegateTarget && (
        <CCDelegateConfirmModal
          isOpen={!!delegateTarget}
          onClose={() => setDelegateTarget(null)}
          onConfirm={handleDelegate}
          userName={delegateTarget.nickname}
        />
      )}
      {profileTarget && (
        <CCUserProfileModal
          isOpen={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          nickname={profileTarget.nickname}
        />
      )}
    </div>
  );
}
