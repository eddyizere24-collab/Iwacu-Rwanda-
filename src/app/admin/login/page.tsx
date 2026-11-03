"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { RwandanSun } from "@/components/RwandanSun";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminTier = "national" | "province" | "district" | "sector" | "cell";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setErrorMsg("Email cyangwa ijambo ry'ibanga si byo. Ongera ugerageze.");
      return;
    }
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload.status !== "success") {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(payload.message_kiny || "Iyi konti nta burenganzira bwo kuyobora ifite.");
        return;
      }
      localStorage.removeItem("iwacu_admin_session");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMsg("Ntibyashobotse kugenzura konti. Reba internet wongere ugerageze.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-rwandan-gradient px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Subira ku rubuga rw'abaturage
        </Link>
        <section className="rounded-3xl border border-sky-100 bg-card p-6 shadow-2xl dark:border-sky-900 sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <RwandanSun size={52} glow />
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#00A3E0]/15 px-3 py-1 text-[11px] font-bold text-[#00A3E0]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Governance Access
            </span>
            <h1 className="mt-3 text-xl font-extrabold text-foreground">Injira mu Rwego rw'Ubuyobozi</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Uburenganzira n'agace ushinzwe bigenzurwa na konti yawe; ntibitoranywa kuri iyi paji.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMsg}</p>}
            <div>
              <label htmlFor="admin-email" className="mb-1 block text-xs font-semibold text-foreground">Email</label>
              <input id="admin-email" type="email" autoComplete="username" required value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]" />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold text-foreground">Ijambo ry'ibanga</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input id="admin-password" type="password" autoComplete="current-password" required value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-[46px] w-full rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 py-2 text-sm font-bold text-white hover:bg-[#194d31] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              {loading ? "Turimo kugenzura..." : "Injira"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
