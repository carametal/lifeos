import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = !!getSupabaseConfig();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/");
  }
  return <main className="min-h-svh bg-stone-50 px-6 py-16 text-stone-900">
    <div className="mx-auto max-w-sm">
      <p className="text-sm font-semibold tracking-widest text-emerald-800">LIFE OS</p>
      <h1 className="mt-6 text-3xl font-semibold">おかえりなさい</h1>
      <p className="mt-4 leading-7 text-stone-600">日々を記録して、自分のペースで暮らしを整えましょう。</p>
      {configured ? <LoginForm /> : <p role="status" className="mt-6 rounded-lg border bg-white p-4">接続設定を準備しています。</p>}
      <p className="mt-6 text-sm leading-6 text-stone-600">事前に作成したアカウントでログインしてください。パスワードを忘れた場合は、管理者による復旧が必要です。</p>
    </div>
  </main>;
}
