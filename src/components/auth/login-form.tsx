"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  const inputClass = "mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-emerald-700";
  return (
    <form action={action} className="mt-6 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="email" className="text-sm font-medium">メールアドレス</label>
        <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" maxLength={254} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">パスワード</label>
        <input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required className={inputClass} />
      </div>
      {state.error && <p role="alert" className="text-sm leading-6 text-red-800">{state.error}</p>}
      <Button type="submit" disabled={pending} className="min-h-12 w-full">{pending ? "ログイン中…" : "ログイン"}</Button>
    </form>
  );
}
