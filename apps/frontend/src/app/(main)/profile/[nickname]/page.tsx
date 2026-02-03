import { getUserProfile } from '@/domains/profile/actions/profile';
import { CCProfileView } from '@/domains/profile/components/CCProfileView';
import { notFound } from 'next/navigation';
import { getActivityStreakServer, getTimelineServer } from '@/api/userServerApi';

interface Props {
  params: Promise<{ nickname: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  // URL 파라미터로 받은 닉네임을 사용해 데이터를 조회합니다.
  const { nickname } = await params;
  const decodedNickname = decodeURIComponent(nickname);
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [user, streak, timeline] = await Promise.all([
    getUserProfile(decodedNickname),
    getActivityStreakServer(decodedNickname),
    getTimelineServer(dateStr, decodedNickname)
  ]);

  if (!user) {
    notFound();
  }

  // The 'isMe' check is handled by the backend and returned in the user profile object.
  // We trust the backend's judgment as it validates the token against the requested nickname.

  return (
    <CCProfileView
      user={user}
      isMe={user.isMe ?? false}
      initialStreak={streak}
      initialTimeline={timeline}
    />
  );
}
