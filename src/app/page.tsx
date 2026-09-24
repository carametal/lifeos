import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-svh bg-stone-50 px-6 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] text-stone-900 sm:pt-24">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold tracking-widest text-emerald-800">LIFE OS</p>
        <h1 className="mt-6 text-3xl leading-snug font-semibold tracking-tight">日々を記録して、<br />暮らしを少しずつ整える。</h1>
        <p className="mt-5 leading-8 text-stone-600">食事を振り返り、自分に合った次の一歩を見つける。あなたのペースで続ける、生活の記録。</p>
        <section aria-labelledby="setup-title" className="mt-10 rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-xs font-medium text-emerald-800">初期構築中</p>
          <h2 id="setup-title" className="mt-2 text-lg font-semibold">記録を始める準備をしています</h2>
          <p id="setup-description" className="mt-3 text-sm leading-7 text-stone-600">ログインと保存機能は、まだ利用できません。準備が整うと、ここから毎日の食事を記録できます。</p>
          <Button disabled aria-describedby="setup-description" className="mt-6 min-h-12 w-full">ログイン（準備中）</Button>
        </section>
      </div>
    </main>
  );
}
