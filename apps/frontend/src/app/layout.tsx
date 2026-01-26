import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/domains/settings/components/ThemeProvider';
import SettingsModal from '@/domains/settings/components/SettingsModal';
import './globals.css';

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
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <ThemeProvider>
          {children}
          <SettingsModal />
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
