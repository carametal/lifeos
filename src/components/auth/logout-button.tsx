"use client";

import { useActionState } from "react";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

function clearDrafts() {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      Object.keys(storage).filter((key) => key.startsWith("lifeos:draft:")).forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can be disabled. Sign-out must still be available.
    }
  }
}

export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { error: "" });
  return <form action={action} onSubmit={clearDrafts}>
    <Button variant="outline" type="submit" disabled={pending} className="min-h-11">{pending ? "ログアウト中…" : "ログアウト"}</Button>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-800">{state.error}</p>}
  </form>;
}
