'use client';

import Link from 'next/link';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CSWrongProblemsPage() {
  return (
    <div className="w-full py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            오답노트
          </h1>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/cs">
              <ArrowLeft className="h-4 w-4" />
              CS 학습으로
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
          <p className="text-sm sm:text-base text-muted-foreground">
            오답노트 목록은 다음 작업(#149)에서 연결됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
