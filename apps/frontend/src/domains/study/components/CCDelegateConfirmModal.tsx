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

interface CCDelegateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

export function CCDelegateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
}: CCDelegateConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>방장 위임</DialogTitle>
          <DialogDescription className="pt-2">
            <strong>{userName}</strong>님에게 방장을 위임하시겠습니까?
            <br />
            <br />
            위임 후에는 방 설정 및 멤버 관리 권한이 이전됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={onConfirm}>
            위임하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
