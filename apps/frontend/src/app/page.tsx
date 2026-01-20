import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Welcome to Peekle</h1>
        <p className="text-sm text-center sm:text-left text-muted-foreground">
          Get started by editing{' '}
          <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
            src/app/page.tsx
          </code>
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Button>Get Started</Button>
          <Button variant="outline">Learn More</Button>
          <Button variant="secondary">View Docs</Button>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Built with Next.js 15 + Tailwind CSS + Shadcn/UI
        </p>
      </footer>
    </div>
  )
}
