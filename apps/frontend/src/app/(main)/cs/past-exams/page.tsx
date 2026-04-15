import { Metadata } from 'next';
import CSModeSwitch from '@/domains/cs/components/CSModeSwitch';
import PastExamList from '@/domains/cs/components/PastExamList';

export const metadata: Metadata = {
  title: '정보처리기사 기출문제 - Peekle',
  description: '과거에 출제된 정보처리기사 기출문제를 실전처럼 풀어보세요.',
};

export default function PastExamsPage() {
  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="pt-2 pb-4">
        <CSModeSwitch />
      </div>

      <div className="mb-6 px-2">
        <h1 className="text-2xl font-extrabold tracking-tight">정보처리기사 기출</h1>
        <p className="text-sm text-muted-foreground mt-1">실전처럼 풀고 오답노트로 복습하세요.</p>
      </div>

      <PastExamList />
    </div>
  );
}
