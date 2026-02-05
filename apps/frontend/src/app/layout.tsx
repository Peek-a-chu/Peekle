import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/domains/settings/components/ThemeProvider';
import SettingsModal from '@/domains/settings/components/SettingsModal';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ClientSessionManager } from '@/components/providers/ClientSessionManager';

export const metadata: Metadata = {
  title: 'Peekle',
  description: 'Peekle Application',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storage = localStorage.getItem('theme-storage');
                  if (!storage) return;
                  const { state } = JSON.parse(storage);
                  const root = document.documentElement;
                  
                  if (state.mode === 'dark') root.classList.add('dark');
                  
                  if (state.accentColor) {
                    const ACCENT_COLORS = {
                      blue: '221 83% 53%',
                      skyblue: '180 100% 35%',
                      orange: '32 95% 50%',
                      pink: '327 73% 60%',
                      green: '132 36% 31%',
                      lime: '132 65% 58%',
                    };
                    const ACCENT_SECONDARY = {
                      blue: '221 83% 95%',
                      skyblue: '180 100% 95%',
                      orange: '32 95% 95%',
                      pink: '327 73% 96%',
                      green: '132 36% 95%',
                      lime: '132 65% 95%',
                    };
                    const ACCENT_SECONDARY_FOREGROUND = {
                      blue: '221 83% 25%',
                      skyblue: '180 100% 25%',
                      orange: '32 95% 25%',
                      pink: '327 73% 25%',
                      green: '132 36% 25%',
                      lime: '132 65% 25%',
                    };

                    if (state.accentColor === 'custom' && state.customColor) {
                      // HSL 변환은 브라우저에서 비용이 크므로, 
                      // 우선 저장된 값 적용 (이미 계산된 HSL이 storage에 있으면 좋겠지만 현재는 HEX만 있음)
                      // 여기서는 우선 기본 컬러만 적용하거나 인라인 스크립트에서는 생략 가능
                    } else if (ACCENT_COLORS[state.accentColor]) {
                      root.style.setProperty('--primary', ACCENT_COLORS[state.accentColor]);
                      root.style.setProperty('--secondary', ACCENT_SECONDARY[state.accentColor]);
                      root.style.setProperty('--secondary-foreground', ACCENT_SECONDARY_FOREGROUND[state.accentColor]);
                    }
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background">
        <QueryProvider>
          <ThemeProvider>
            <ClientSessionManager />
            {children}
            <SettingsModal isGlobal={true} />
          </ThemeProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
