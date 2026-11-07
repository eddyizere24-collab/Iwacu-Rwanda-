"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/office/office-logic";

const field = "min-h-[48px] w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#00A3E0]";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== again) { setError("Amagambo y'ibanga ntangana."); return; }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError("Ntibyashobotse guhindura ijambo ry'ibanga. Ongera ugerageze."); return; }
      const res = await fetch("/api/admin/office/me", { method: "POST", credentials: "same-origin" });
      if (!res.ok) { setError("Ijambo ry'ibanga ryahindutse ariko ntibyabitswe. Ongera ugerageze."); return; }
      router.replace("/admin/ibiro");
      router.refresh();
    } catch {
      setError("Serivisi ntiyabonetse. Ongera ugerageze.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-rwandan-gradient px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-sky-100 bg-card p-6 shadow-2xl sm:p-9">
        <h1 className="mb-6 text-xl font-extrabold text-foreground">Hitamo ijambo ry'ibanga rishya</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className={field} type="password" autoComplete="new-password" placeholder="Ijambo ry'ibanga rishya" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className={field} type="password" autoComplete="new-password" placeholder="Ongera ryandike" value={again} onChange={(e) => setAgain(e.target.value)} required />
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
          <button type="submit" disabled={busy} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white disabled:opacity-60">
            <Lock className="h-4 w-4" /> {busy ? "…" : "Bika"}
          </button>
        </form>
      </section>
    </main>
  );
}
