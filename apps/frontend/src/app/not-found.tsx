import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">404 - 페이지를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground">요청하신 리소스가 존재하지 않거나 삭제되었습니다.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
