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
import { ReactNode } from 'react';

/**
 * 공통 모달 컴포넌트 - 단일 버튼 (확인/닫기만)
 */
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string | ReactNode;
    confirmText?: string;
    variant?: 'default' | 'destructive';
}

export function ConfirmModal({
    isOpen,
    onClose,
    title,
    description,
    confirmText = '확인',
    variant = 'default',
}: ConfirmModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription className="pt-2">
                            {typeof description === 'string' ? (
                                <span className="whitespace-pre-line">{description}</span>
                            ) : (
                                description
                            )}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter className="sm:justify-end">
                    <Button
                        type="button"
                        variant={variant}
                        onClick={onClose}
                        className="min-w-[80px]"
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * 공통 모달 컴포넌트 - 이중 버튼 (취소/확인)
 */
interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string | ReactNode;
    cancelText?: string;
    confirmText?: string;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
}

export function ActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    cancelText = '취소',
    confirmText = '확인',
    variant = 'default',
    isLoading = false,
}: ActionModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription className="pt-2">
                            {typeof description === 'string' ? (
                                <span className="whitespace-pre-line">{description}</span>
                            ) : (
                                description
                            )}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                        className="min-w-[80px]"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={variant}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="min-w-[80px]"
                    >
                        {isLoading ? '처리중...' : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
