import { Copy, RefreshCw, Key } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getGameInviteCode } from '@/domains/game/api/game-api';
import { cn } from '@/lib/utils';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string | number;
}

export function InviteModal({ open, onOpenChange, roomId }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchInviteCode = useCallback(async () => {
    setIsLoading(true);
    try {
      const code = await getGameInviteCode(roomId);
      if (code) {
        setInviteCode(code);
      } else {
        toast.error('초대 코드를 가져오지 못했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch invite code:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open) {
      fetchInviteCode();
    }
  }, [open, fetchInviteCode]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    } catch {
      toast.error('코드 복사에 실패했습니다');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] gap-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            초대하기
          </DialogTitle>
          <DialogDescription>
            참여자에게 초대 코드를 전달하여 방에 초대하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-xl blur-xl group-hover:bg-primary/10 transition-colors" />
            <div className="relative flex flex-col items-center justify-center py-8 bg-card border border-border rounded-xl gap-4 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">초대 코드</span>
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <span className="text-4xl font-black tracking-[0.2em] text-primary select-all tabular-nums">
                    {inviteCode || '--------'}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchInviteCode}
                  disabled={isLoading}
                  className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                  title="코드 재발급"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={() => void handleCopyCode()}
            disabled={!inviteCode || isLoading}
            className="w-full h-12 text-base font-bold gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />
            초대 코드 복사하기
          </Button>
        </div>

        <div className="flex flex-col gap-1 px-1">
          <p className="text-[11px] text-muted-foreground">• 초대 코드는 생성 후 10분 동안 유효합니다.</p>
          <p className="text-[11px] text-muted-foreground">• 새로운 코드를 생성하면 이전 코드는 더 이상 사용할 수 없습니다.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

