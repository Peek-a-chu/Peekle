import { getSubmissionHistory } from '@/domains/profile/actions/history';
import { CCHistoryList } from '@/domains/profile/components/CCHistoryList';

interface Props {
  params: Promise<{ nickname: string }>;
}

export default async function HistoryPage({ params }: Props) {
  const { nickname } = await params;
  const decodedNickname = decodeURIComponent(nickname);
  const history = await getSubmissionHistory(decodedNickname);
  return <CCHistoryList initialHistory={history} />;
}
