'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface KickConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

export function KickConfirmModal({ isOpen, onClose, onConfirm, userName }: KickConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>강퇴 확인</DialogTitle>
          <DialogDescription className="pt-2">
            <strong>{userName}</strong>님을 스터디에서 내보내시겠습니까?
            <br />
            <br />
            강퇴된 유저는 다시 초대 코드로 참여할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            강퇴하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
