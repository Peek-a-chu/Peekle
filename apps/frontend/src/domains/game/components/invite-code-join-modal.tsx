'use client';

import { useState } from 'react';
import { Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteCodeJoinModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (code: string) => Promise<void>;
}

export function InviteCodeJoinModal({ open, onOpenChange, onSubmit }: InviteCodeJoinModalProps) {
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(code.trim().toUpperCase());
            setCode('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        초대 코드로 입장
                    </DialogTitle>
                    <DialogDescription>
                        전달받은 8자리 참여 코드를 입력해주세요.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <Input
                        placeholder="예: ABC12345"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="text-center text-xl font-bold tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-sm h-12"
                        maxLength={8}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={code.length < 4 || isSubmitting}
                        >
                            {isSubmitting ? '확인 중...' : '입장하기'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
