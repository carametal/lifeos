"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { loginSchema, type AuthState } from "./schema";
import { describeLoginError } from "./login-error";

export async function login(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "メールアドレスとパスワードを確認してください。" };
  if (!getSupabaseConfig()) return { error: "接続設定が完了していません。" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      const diagnostic = describeLoginError(error, process.env.NODE_ENV === "development");
      if (process.env.NODE_ENV === "development") {
        console.warn("[auth] Login failed", { code: diagnostic.code, status: diagnostic.status });
      }
      return { error: diagnostic.message };
    }
  } catch {
    return { error: "接続できませんでした。時間をおいてお試しください。" };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout(): Promise<AuthState> {
  if (!getSupabaseConfig()) redirect("/login");
  try {
    const supabase = await createClient();
    // Signing out clears this browser's session, including an expired session.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "ログアウトできませんでした。もう一度お試しください。" };
  } catch {
    return { error: "接続できませんでした。もう一度お試しください。" };
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
