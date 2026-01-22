import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import Sidebar from '@/domains/lnb/components/Sidebar'

export const metadata: Metadata = {
  title: 'Peekle',
  description: 'Peekle Application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-[240px] p-8 w-full">
          {children}
            <Toaster />
        </main>
      </body>
    </html>
  );
}