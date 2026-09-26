import { LogoutButton } from "@/components/auth/logout-button";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  return <main className="min-h-svh bg-stone-50 px-6 py-12 text-stone-900">
    <div className="mx-auto max-w-lg">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-widest text-emerald-800">LIFE OS</p>
        <LogoutButton />
      </header>
      <h1 className="mt-10 text-3xl font-semibold">暮らしの記録</h1>
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">ログインできました</h2>
        <p role="status" className="mt-3 text-sm leading-7 text-stone-600">
          {error || !profile
            ? "データの準備がまだ完了していないか、接続できません。管理者が設定を確認した後、再読み込みしてください。"
            : "記録用のデータベースに接続できています。食事の登録機能は次の段階で追加します。"}
        </p>
      </section>
    </div>
  </main>;
}
