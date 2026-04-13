'use client';

import { toast as sonnerToast } from 'sonner';

type ToastVariant = 'default' | 'destructive';

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

function emitToast(input: ToastInput | string) {
  if (typeof input === 'string') {
    return sonnerToast(input);
  }

  const title = input.title ?? '';
  const description = input.description;

  if (input.variant === 'destructive') {
    return sonnerToast.error(title || 'Error', { description });
  }

  return sonnerToast(title, { description });
}

export function useToast() {
  return { toast: emitToast };
}

export { emitToast as toast };
