import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-secondary/10 flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="inline-block font-bold">Peekle 관리자</span>
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/admin/cs-content"
                className="flex items-center text-sm font-medium text-muted-foreground"
              >
                CS 콘텐츠
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
              <Link href="/">
                <div className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">관리자 화면 나가기</span>
                </div>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-8">{children}</main>
    </div>
  );
}
