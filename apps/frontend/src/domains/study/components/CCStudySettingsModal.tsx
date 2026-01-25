'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CCStudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CCStudySettingsModal({ isOpen, onClose }: CCStudySettingsModalProps) {
  const router = useRouter();
  const roomTitle = useRoomStore((state) => state.roomTitle);
  const roomDescription = useRoomStore((state) => state.roomDescription);
  const setRoomInfo = useRoomStore((state) => state.setRoomInfo);

  const [title, setTitle] = useState(roomTitle);
  const [description, setDescription] = useState(roomDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(roomTitle);
      setDescription(roomDescription);
    }
  }, [isOpen, roomTitle, roomDescription]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to update room settings
      await new Promise((resolve) => setTimeout(resolve, 500));

      setRoomInfo({ roomTitle: title, roomDescription: description });
      toast.success('스터디 설정이 저장되었습니다.');
      onClose();
    } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // TODO: Call API to delete room
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('스터디룸이 삭제되었습니다.');
      onClose();
      router.push('/study'); // Redirect to study list
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>스터디 설정</DialogTitle>
          <DialogDescription>스터디룸의 이름과 설명을 수정할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">스터디 이름</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="스터디 이름을 입력하세요"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="스터디 설명을 입력하세요"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <div className="flex-1 text-left">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSaving || isDeleting}>
                  방 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    모든 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDelete()} disabled={isDeleting}>
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
              취소
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving || isDeleting}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
