'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTitle: string;
  onSubmit: (password: string) => void;
}

export function PasswordModal({ open, onOpenChange, roomTitle, onSubmit }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요');
      return;
    }
    onSubmit(password);
    setPassword('');
    setError('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            비밀번호 입력
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{roomTitle}</span> 방에 입장하려면
            비밀번호를 입력하세요.
          </p>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
            입장하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
