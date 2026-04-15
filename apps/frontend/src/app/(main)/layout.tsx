import Sidebar from '@/domains/lnb/components/Sidebar';
import MobileBottomNav from '@/domains/lnb/components/MobileBottomNav';
import LeagueResultModal from '@/domains/league/components/LeagueResultModal';
import { getMyProfile } from '@/domains/profile/actions/profile';
import MainContentWrapper from './MainContentWrapper';

export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getMyProfile();

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden lg:h-auto lg:min-h-screen lg:overflow-visible">
      <Sidebar user={user} />
      <MainContentWrapper>
        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto overflow-y-auto px-4 py-0 lg:px-8 lg:overflow-visible">
          {children}
        </main>
        <div className="shrink-0 lg:hidden">
          <MobileBottomNav />
        </div>
      </MainContentWrapper>
      <LeagueResultModal />
    </div>
  );
}
