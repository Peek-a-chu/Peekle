import { fetchUserHistory } from '@/domains/profile/actions/history';
import { CCHistoryList } from '@/domains/profile/components/CCHistoryList';

interface Props {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HistoryPage({ params, searchParams }: Props) {
  const { nickname } = await params;
  const sp = await searchParams;

  const date = typeof sp.date === 'string' ? sp.date : undefined;
  const tier = typeof sp.tier === 'string' ? sp.tier : undefined;
  const sourceType = typeof sp.sourceType === 'string' ? sp.sourceType : undefined;
  const status = typeof sp.status === 'string' ? sp.status : undefined;

  const decodedNickname = decodeURIComponent(nickname);

  // Check ownership
  const { getUserProfile } = await import('@/domains/profile/actions/profile');
  const user = await getUserProfile(decodedNickname);

  if (!user || user.isMe === false) {
    // If user doesn't exist or it's not the logged-in user, deny access.
    // We can use notFound() or redirect to profile.
    // User requested "error page", notFound() is standard 404/error.
    const { notFound } = await import('next/navigation');
    notFound();
  }

  const history = await fetchUserHistory(decodedNickname, {
    date,
    tier,
    sourceType,
    status,
  });
  return <CCHistoryList initialHistory={history} />;
}
