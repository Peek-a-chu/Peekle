import Sidebar from '@/domains/lnb/components/Sidebar';
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
      <main className="flex-1 ml-[240px] px-8 py-0 w-full max-w-7xl mx-auto">{children}</main>
      <LeagueResultModal />
    </div>
  );
}
