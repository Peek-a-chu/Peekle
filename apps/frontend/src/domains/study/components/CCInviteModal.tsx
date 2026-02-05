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
import { useQuery } from '@tanstack/react-query';

interface CCInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CCInviteModal({ isOpen, onClose }: CCInviteModalProps) {
  const roomId = useRoomStore((state) => state.roomId);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inviteCode', roomId],
    queryFn: () => {
      if (!roomId) throw new Error('Room ID is required');
      return generateInviteCode(roomId);
    },
    enabled: !!roomId && isOpen,
    staleTime: 4.5 * 60 * 1000, // 4분 30초 (백엔드 TTL 5분보다 짧게)
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false, // 창 포커스 시 재요청 방지
  });

  const inviteCode = data?.inviteCode;

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
          <Button
            variant="secondary"
            className="dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            onClick={onClose}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
