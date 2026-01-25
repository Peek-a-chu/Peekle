import { getMyProfile } from '@/domains/profile/actions/profile';
import { CCProfileView } from '@/domains/profile/components/CCProfileView';

export default async function MyProfilePage() {
    // 실제로는 서버 세션 등에서 내 ID를 가져오거나 API를 호출합니다.
    const user = await getMyProfile();

    return <CCProfileView user={user} isMe={true} />;
}
