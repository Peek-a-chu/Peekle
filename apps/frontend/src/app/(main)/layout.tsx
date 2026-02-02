import Sidebar from '@/domains/lnb/components/Sidebar';
import { getMyProfile } from '@/domains/profile/actions/profile';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getMyProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 ml-[240px] px-8 py-0 w-full">{children}</main>
    </div>
  );
}
