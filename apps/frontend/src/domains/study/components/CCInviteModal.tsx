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
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { toast } from 'sonner';

interface CCInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CCInviteModal({ isOpen, onClose }: CCInviteModalProps) {
  const inviteCode = useRoomStore((state) => state.inviteCode);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
              Link
            </Label>
            <Input
              id="link"
              value={inviteCode}
              readOnly
              className="font-mono text-center tracking-wider text-lg"
            />
          </div>
          <Button type="submit" size="sm" className="px-3" onClick={() => void handleCopy()}>
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
