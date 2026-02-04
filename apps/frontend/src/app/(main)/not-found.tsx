import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-2 animate-bounce">
        <FileQuestion className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground text-lg">
          존재하지 않는 사용자이거나,
          <br />
          요청하신 리소스가 삭제되었을 수 있습니다.
        </p>
      </div>
      <Link
        href="/home"
        className="mt-4 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-200"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
