import Sidebar from '@/domains/lnb/components/Sidebar';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px] p-8 w-full">{children}</main>
    </div>
  );
}
