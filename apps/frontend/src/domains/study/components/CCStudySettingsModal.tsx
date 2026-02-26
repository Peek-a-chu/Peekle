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
import { useRoomStore, selectIsOwner } from '@/domains/study/hooks/useRoomStore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';

interface CCStudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CCStudySettingsModal({ isOpen, onClose }: CCStudySettingsModalProps) {
  const router = useRouter();
  const roomTitle = useRoomStore((state) => state.roomTitle);
  const roomDescription = useRoomStore((state) => state.roomDescription);
  const isOwner = useRoomStore(selectIsOwner); // Selector for owner check

  const { updateStudyInfo, deleteStudy, quitStudy } = useStudySocketActions();

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
    if (!isOwner) return;
    setIsSaving(true);
    try {
      updateStudyInfo(title, description);
      toast.success('설정 변경 요청을 전송했습니다.');
      onClose();
    } catch {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setIsDeleting(true);
    try {
      deleteStudy();
      // Socket event will handle redirect
      onClose();
    } catch {
      toast.error('삭제 요청에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeave = async () => {
    setIsDeleting(true); // Reuse deleting state for loading
    try {
      quitStudy();
      toast.success('스터디를 탈퇴했습니다.');
      router.push('/home');
      onClose();
    } catch {
      toast.error('탈퇴 요청에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isOwner ? '스터디 설정' : '스터디 정보'}</DialogTitle>
          <DialogDescription>
            {isOwner
              ? '스터디룸의 이름과 설명을 수정하거나 삭제할 수 있습니다.'
              : '스터디룸의 정보를 확인하거나 탈퇴할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">스터디 이름</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={isOwner ? handleKeyDown : undefined}
              placeholder="스터디 이름을 입력하세요"
              readOnly={!isOwner}
              className={!isOwner ? 'bg-muted' : ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">설명</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={isOwner ? handleKeyDown : undefined}
              placeholder="스터디 설명을 입력하세요"
              readOnly={!isOwner}
              className={!isOwner ? 'bg-muted' : ''}
            />
          </div>
        </div>
        <DialogFooter className="flex-col justify-between flex-row gap-2">
          {isOwner ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    스터디 삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      스터디룸을 삭제하면 모든 멤버가 퇴장되며 복구할 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    스터디 탈퇴
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      스터디룸에서 나가면 다시 초대코드를 통해 입장해야 합니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeave}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      탈퇴
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
