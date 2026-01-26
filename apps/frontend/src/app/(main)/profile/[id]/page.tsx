import { getUserProfile } from '@/domains/profile/actions/profile';
import { CCProfileView } from '@/domains/profile/components/CCProfileView';

interface Props {
  params: { id: string };
}

export default async function UserProfilePage({ params }: Props) {
  // URL 파라미터로 받은 아이디를 사용해 데이터를 조회합니다.
  const user = await getUserProfile(params.id);
  console.log(user);
  return <CCProfileView user={user} isMe={false} />;
}
