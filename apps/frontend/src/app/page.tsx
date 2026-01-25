import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Gamepad2, Trophy, Target, ArrowRight, Code2, Zap } from 'lucide-react';

export default function Home() {
  return (
    // 1. 전체 배경: config의 background (#F7F8FC)
    <div className="min-h-screen bg-background font-sans selection:bg-secondary selection:text-primary flex flex-col">
      {/* --- 헤더 --- */}
      <header className="sticky top-0 w-full flex justify-between items-center px-6 py-4 bg-background/80 backdrop-blur-md z-50 border-b border-border max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Code2 className="text-primary w-6 h-6" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            힐끔힐끔코딩 <span className="text-primary">Peekle</span>
          </span>
        </div>
        <div>
          <Link href="/login">
            <Button className="font-bold rounded-md px-6">로그인</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* --- 메인 히어로 섹션 --- */}
        <section className="flex flex-col items-center justify-center text-center pt-24 pb-32 px-4 max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-foreground">
            함께 성장하는 <br className="md:hidden" />
            <span className="text-primary">알고리즘 스터디</span>
          </h1>
          {/* 보조 글씨: 디자인 시안의 #6B7280 적용 */}
          <p className="text-lg md:text-xl text-[#6B7280] max-w-2xl mb-10 leading-relaxed font-medium break-keep">
            실시간 화상 스터디와 경쟁적인 게임 모드로
            <br className="hidden md:block" /> 알고리즘 실력을 빠르게 향상시키세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="text-lg px-8 py-6 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 font-bold"
              >
                시작하기 <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* --- 특징 소개 (Features) --- */}
        <section className="py-24 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                왜 힐끔힐끔코딩(<span className="text-primary">Peekle</span>) 인가요?
              </h2>
              <p className="text-[#6B7280] text-lg">알고리즘 학습의 새로운 방법을 제시합니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Users,
                  title: '실시간 스터디',
                  desc: '화상으로 함께 문제를 풀고 코드를 공유하세요',
                },
                {
                  icon: Gamepad2,
                  title: '경쟁 게임 모드',
                  desc: '스피드 레이스, 타임어택 등 다양한 게임 모드로 실력을 겨뤄보세요.',
                },
                {
                  icon: Trophy,
                  title: '리그 시스템',
                  desc: '매주 경쟁하고 승급하여 실력을 증명하세요',
                },
                {
                  icon: Target,
                  title: 'AI 문제 추천',
                  desc: '나에게 딱 맞는 문제를 AI가 추천해드려요',
                },
              ].map((item, idx) => (
                // 카드: bg-card (#FFFFFF), border-card-border (#F7E8F0) 사용
                <div
                  key={idx}
                  className="bg-card p-8 rounded-2xl border border-card-border shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* 아이콘: 시안대로 배경 없이 핑크색 아이콘만 강조 */}
                  <div className="mb-6">
                    <item.icon className="text-primary w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-foreground">{item.title}</h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed break-keep">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- 통계 섹션 --- */}
        <section className="py-24 border-t border-border bg-background">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-center px-4">
            {[
              { num: '10,000+', label: '활성 사용자' },
              { num: '500,000+', label: '문제 풀이 수' },
              { num: '5,000+', label: '스터디 방' },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center w-full">
                <span className="text-4xl md:text-5xl font-extrabold text-primary mb-2">
                  {stat.num}
                </span>
                <span className="text-[#6B7280] font-medium tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* --- 하단 CTA (핑크 배경) --- */}
        <section className="bg-primary py-32 text-center px-4 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">지금 바로 시작하세요</h2>
            <p className="text-white/90 mb-10 text-lg md:text-xl font-medium">
              무료로 가입하고 알고리즘 실력을 키워보세요.
            </p>
            <Link href="/login">
              {/* 흰색 버튼에 검은 글씨 (시안 반영) */}
              <Button
                size="lg"
                className="bg-white text-foreground hover:bg-gray-100 text-lg px-8 py-6 rounded-md font-bold shadow-2xl transition-all"
              >
                무료로 시작하기 <Zap className="w-5 h-5 ml-2 fill-current" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* --- 푸터 --- */}
      <footer className="py-10 text-center text-[#6B7280] text-sm bg-background border-t border-border">
        <p>© 2026 Peekle. All rights reserved.</p>
      </footer>
    </div>
  );
}
