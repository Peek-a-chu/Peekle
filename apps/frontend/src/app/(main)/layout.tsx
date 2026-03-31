import Sidebar from '@/domains/lnb/components/Sidebar';
import MobileBottomNav from '@/domains/lnb/components/MobileBottomNav';
import LeagueResultModal from '@/domains/league/components/LeagueResultModal';
import { getMyProfile } from '@/domains/profile/actions/profile';

export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getMyProfile();

  return (
    <div className="flex h-[100dvh] min-h-screen overflow-hidden lg:h-auto lg:min-h-screen lg:overflow-visible">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[240px]">
        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto overflow-y-auto px-4 py-0 lg:px-8 lg:overflow-visible">
          {children}
        </main>
        <div className="shrink-0 lg:hidden">
          <MobileBottomNav />
        </div>
      </div>
      <LeagueResultModal />
    </div>
  );
}
