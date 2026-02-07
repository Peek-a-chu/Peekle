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
import { Textarea } from '@/components/ui/textarea';
import { createStudy } from '@/domains/study/api/studyApi';
import { toast } from 'sonner';

interface CCCreateStudyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdStudyId?: number) => void | Promise<void>;
}

export function CCCreateStudyModal({ open, onOpenChange, onSuccess }: CCCreateStudyModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('방 제목을 입력해주세요');
      return;
    }

    if (title.trim().length > 20) {
      setError('방 제목은 20자 이하여야 합니다');
      return;
    }

    if (!description.trim()) {
      setError('방 설명을 입력해주세요');
      return;
    }

    if (description.trim().length > 50) {
      setError('방 설명은 50자 이하여야 합니다');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const created = await createStudy(title.trim(), description.trim());
      const createdStudyId = created.studyId ?? created.id ?? created.roomId;
      toast.success('스터디 방이 생성되었습니다!');
      setTitle('');
      setDescription('');
      onOpenChange(false);
      await onSuccess(createdStudyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : '생성에 실패했습니다';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>스터디 방 만들기</DialogTitle>
          <DialogDescription>새로운 스터디 방을 생성하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              방 제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="스터디 방 제목을 입력하세요"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              disabled={isLoading}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">{title.length}/20</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              방 설명 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="스터디 방에 대한 설명을 입력하세요"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setDescription(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              maxLength={50}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length}/50</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isLoading}>
            {isLoading ? '생성 중...' : '만들기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
