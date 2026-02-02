import Sidebar from '@/domains/lnb/components/Sidebar';
import { LeaguePromotionModal } from '@/domains/league/components/LeaguePromotionModal';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px] px-8 py-0 w-full">{children}</main>
      <LeaguePromotionModal />
    </div>
  );
}
