import { getUserProfile } from '@/domains/profile/actions/profile';
import { CCProfileView } from '@/domains/profile/components/CCProfileView';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ nickname: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  // URL 파라미터로 받은 닉네임을 사용해 데이터를 조회합니다.
  const { nickname } = await params;
  const decodedNickname = decodeURIComponent(nickname);
  const user = await getUserProfile(decodedNickname);

  if (!user) {
    notFound();
  }

  return <CCProfileView user={user} isMe={user.isMe ?? false} />;
}
