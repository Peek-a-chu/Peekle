import 'server-only';

import { CCStudyRankingBoard } from '@/domains/ranking/components/CCStudyRankingBoard';
import { CCMainPageHeader } from '@/components/common/CCMainPageHeader';

export default function RankingPage(): React.ReactNode {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <CCMainPageHeader title="스터디 랭킹" />
        <CCStudyRankingBoard />
      </div>
    </div>
  );
}
