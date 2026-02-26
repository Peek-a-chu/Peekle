'use client';

import { Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GameInviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomId: string | number;
}

export function GameInviteModal({ open, onOpenChange, roomId }: GameInviteModalProps) {
    const gameUrl = typeof window !== 'undefined' ? `${window.location.origin}/game/${roomId}` : '';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(gameUrl);
            toast.success('초대 링크가 복사되었습니다!');
        } catch {
            toast.error('링크 복사에 실패했습니다');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[360px] p-5 gap-5 rounded-xl">
                {/* Header */}
                <DialogHeader className="flex flex-row items-center space-y-0 pt-1">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <div className="flex items-center justify-center p-1.5 rounded-md bg-pink-50 text-pink-500">
                            <LinkIcon className="h-4 w-4" />
                        </div>
                        게임 초대하기
                    </DialogTitle>
                </DialogHeader>

                {/* Body */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="game-link" className="text-sm font-medium text-foreground">
                            초대 링크
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1 min-w-0">
                                <Input
                                    id="game-link"
                                    value={gameUrl}
                                    readOnly
                                    className="font-mono text-xs bg-muted/30 focus-visible:ring-1 focus-visible:ring-pink-500/30 pr-2 truncate"
                                    title={gameUrl}
                                />
                            </div>
                            <Button
                                size="sm"
                                onClick={handleCopyLink}
                                className="shrink-0 gap-1.5 bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-500/20"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                <span className="text-xs font-semibold">복사</span>
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            링크를 복사해 친구에게 보내세요.
                        </p>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
