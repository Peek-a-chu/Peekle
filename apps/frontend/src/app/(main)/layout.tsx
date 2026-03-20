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
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-0 pb-20 lg:pb-0 lg:ml-[240px]">
        {children}
      </main>
      <MobileBottomNav />
      <LeagueResultModal />
    </div>
  );
}
