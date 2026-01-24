'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InviteModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
}

export function InviteModal({ open, onOpenChange, roomId }: InviteModalProps) {
    const inviteUrl = `https://algostudy.app/game/${roomId}`

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl)
            toast.success('링크가 복사되었습니다!')
        } catch {
            toast.error('링크 복사에 실패했습니다')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>초대하기</DialogTitle>
                </DialogHeader>

                {/* URL 표시 */}
                <div className="flex items-center gap-2">
                    <Input
                        readOnly
                        value={inviteUrl}
                        className="flex-1 bg-muted"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyLink}
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
