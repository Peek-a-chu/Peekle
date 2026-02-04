'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { generateInviteCode } from '@/domains/study/api/studyApi';
import { toast } from 'sonner';

interface CCInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CCInviteModal({ isOpen, onClose }: CCInviteModalProps) {
  const roomId = useRoomStore((state) => state.roomId);
  const storeInviteCode = useRoomStore((state) => state.inviteCode);
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);
  const [inviteCode, setInviteCode] = useState(storeInviteCode);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch invite code when modal opens
  useEffect(() => {
    if (isOpen && roomId) {
      // If we already have an invite code in store, use it
      if (storeInviteCode) {
        setInviteCode(storeInviteCode);
        return;
      }

      // Otherwise, fetch from API
      setIsLoading(true);
      generateInviteCode(roomId)
        .then((result) => {
          const code = result.inviteCode;
          setInviteCode(code);
          // Update store for future use
          setRoomInfo({ inviteCode: code });
        })
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : '초대 코드를 불러오는데 실패했습니다';
          toast.error(message);
          console.error('Failed to generate invite code:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, roomId, storeInviteCode, setRoomInfo]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('초대 코드가 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>친구 초대하기</DialogTitle>
          <DialogDescription>
            아래의 초대 코드를 친구에게 공유하여 스터디에 초대하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              초대 코드
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  초대 코드를 불러오는 중...
                </span>
              </div>
            ) : (
              <Input
                id="link"
                value={inviteCode || ''}
                readOnly
                placeholder={inviteCode ? undefined : '초대 코드를 불러올 수 없습니다'}
                className="font-mono text-center tracking-wider text-lg"
              />
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="px-3"
            onClick={() => void handleCopy()}
            disabled={!inviteCode || isLoading}
          >
            <span className="sr-only">Copy</span>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
