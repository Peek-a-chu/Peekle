import 'server-only';

import { CCStudyRankingBoard } from '@/domains/ranking/components/CCStudyRankingBoard';

export default function RankingPage(): React.ReactNode {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <h1 className="mb-6 text-2xl font-bold text-[#040C13]">스터디 랭킹</h1>
        <CCStudyRankingBoard />
      </div>
    </div>
  );
}
