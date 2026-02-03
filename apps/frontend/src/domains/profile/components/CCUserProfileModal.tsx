'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserProfile } from '@/domains/profile/types';
import { fetchUserProfile } from '@/domains/profile/api/profileApi';
import { useEffect, useState } from 'react';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, CheckCircle, MapPin, User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CCUserProfileModalProps {
  nickname: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CCUserProfileModal({ nickname, isOpen, onClose }: CCUserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && nickname) {
      setLoading(true);
      setError(null);
      setProfile(null);

      fetchUserProfile(nickname)
        .then((data) => {
          setProfile(data);
        })
        .catch((err) => {
          console.error(err);
          setError('프로필을 불러오는데 실패했습니다.');
          toast.error('프로필 정보를 가져올 수 없습니다.');
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, nickname, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-xl">프로필 정보</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">정보를 불러오는 중입니다...</p>
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {/* Fallback to simple img for debug */}
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                  {profile.profileImg ? (
                    <img
                      src={profile.profileImg}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {profile.nickname.substring(0, 1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                  {profile.nickname}
                  {profile.isMe && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                      나
                    </Badge>
                  )}
                </h2>
                {profile.bojId && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <span className="font-semibold text-foreground/80">BOJ</span> {profile.bojId}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
                <span className="text-xs text-muted-foreground mb-0.5">현재 리그</span>
                <span className="font-bold text-lg">{profile.league || 'Unranked'}</span>
                <span className="text-xs text-muted-foreground">
                  {profile.leaguePoint.toLocaleString()} P
                </span>
              </div>

              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <Flame className="h-6 w-6 text-orange-500 mb-2" />
                <span className="text-xs text-muted-foreground mb-0.5">활동 스트릭</span>
                <span className="font-bold text-lg">{profile.streakCurrent}일</span>
                <span className="text-xs text-muted-foreground">최대 {profile.streakMax}일</span>
              </div>

              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                <span className="text-xs text-muted-foreground mb-0.5">해결한 문제</span>
                <span className="font-bold text-lg">
                  {profile.solvedCount.toLocaleString()} 문제
                </span>
              </div>
            </div>
          </div>
        ) : (
          !error && <div className="py-10 text-center">데이터가 없습니다.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
