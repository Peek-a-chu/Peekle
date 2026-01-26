import { getSubmissionHistory } from '@/domains/profile/actions/history';
import { CCHistoryList } from '@/domains/profile/components/CCHistoryList';

export default async function HistoryPage() {
  const history = await getSubmissionHistory();
  return <CCHistoryList initialHistory={history} />;
}
