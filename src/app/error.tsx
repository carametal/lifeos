"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg px-6 py-16">
    <h1 className="text-xl font-semibold">読み込みできませんでした</h1>
    <p className="my-4">時間をおいて、もう一度お試しください。</p>
    <Button onClick={reset} className="min-h-11">再試行</Button>
  </main>;
}
