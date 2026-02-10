'use client';

import { useState } from 'react';
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
import { joinStudy } from '@/domains/study/api/studyApi';
import { toast } from 'sonner';
import { StudyRoomDetail } from '@/domains/study/types';

interface CCJoinStudyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (study: StudyRoomDetail) => void;
}

export function CCJoinStudyModal({ open, onOpenChange, onSuccess }: CCJoinStudyModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await joinStudy(inviteCode.trim());
      toast.success('스터디에 참여했습니다!');
      onSuccess(result);
      setInviteCode('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '참여에 실패했습니다';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setInviteCode('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>스터디 참여하기</DialogTitle>
          <DialogDescription>초대 코드를 입력하여 스터디에 참여하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">초대 코드</Label>
            <Input
              id="inviteCode"
              placeholder="초대 코드를 입력하세요"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSubmit();
                }
              }}
              disabled={isLoading}
              className="font-mono tracking-wider"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isLoading}>
            {isLoading ? '참여 중...' : '참여하기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
