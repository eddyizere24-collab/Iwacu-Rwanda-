"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowLeft, Landmark, Building2, MapPin, Home } from "lucide-react";
import { PlaceEntry } from "@/components/office/PlaceEntry";
import { RwandanSun } from "@/components/RwandanSun";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginToEmail } from "@/lib/office/office-logic";

type Tier = "country" | "district" | "sector" | "cell";


function NationalForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginToEmail(email),
        password,
      });

      if (signInError) {
        setError("Izina cyangwa ijambo ry'ibanga si byo.");
        return;
      }

      // The server validates the Auth session and obtains the real role/scope
      // from admin_role_assignments. No role picker, localStorage token or
      // client-supplied scope is accepted.
      const response = await fetch("/api/admin/leader-registry/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => null) as {
        status?: string;
        code?: string;
        mfa_mode?: "setup" | "challenge";
        message_kiny?: string;
      } | null;

      if (response.status === 403 && result?.code === "MFA_REQUIRED") {
        router.replace("/admin/mfa");
        return;
      }

      if (!response.ok || result?.status !== "success") {
        await supabase.auth.signOut();
        setError(result?.message_kiny || "Konti yawe nta burenganzira bw'ubuyobozi ifite.");
        return;
      }

      const meRes = await fetch("/api/admin/office/me", { cache: "no-store", credentials: "same-origin" });
      const me = await meRes.json().catch(() => null) as { profile?: { must_change_password?: boolean } | null } | null;
      router.replace(me?.profile?.must_change_password ? "/admin/ijambo-ry-ibanga" : "/admin/ibiro");
      router.refresh();
    } catch {
      setError("Serivisi yo kwinjira ntiyabonetse. Ongera ugerageze.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BackButton onClick={onBack} />
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold text-foreground">Izina cyangwa email</label>
            <input
              id="admin-email"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#00A3E0]"
              placeholder="Izina ryo kwinjira"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold text-foreground">Ijambo ry'ibanga</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#00A3E0]"
              placeholder="Ijambo ry'ibanga"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white transition hover:bg-[#1b5234] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {loading ? "Turimo kugenzura konti..." : "Injira"}
          </button>
        </form>
    </>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-4 inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Subira inyuma
    </button>
  );
}

const TIERS: { id: Tier; label: string; Icon: typeof Landmark }[] = [
  { id: "country", label: "Igihugu", Icon: Landmark },
  { id: "district", label: "Akarere", Icon: Building2 },
  { id: "sector", label: "Umurenge", Icon: MapPin },
  { id: "cell", label: "Akagari", Icon: Home },
];

export default function AdminLoginPage() {
  const [tier, setTier] = useState<Tier | null>(null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-rwandan-gradient px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-sky-100 bg-card p-6 shadow-2xl dark:border-sky-900 sm:p-9">
        <Link href="/" className="mb-7 inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Subira ku rubuga rw'abaturage
        </Link>
        <div className="mb-7 flex flex-col items-center text-center">
          <RwandanSun size={52} glow />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#00A3E0]/15 px-3 py-1 text-[11px] font-bold text-[#00A3E0]">
            <ShieldCheck className="h-3.5 w-3.5" /> IWACU RWANDA · ADMIN
          </span>
          <h1 className="mt-3 text-xl font-extrabold text-foreground">Kwinjira mu buyobozi</h1>
        </div>
        {tier === null && (
          <div className="grid grid-cols-2 gap-3">
            {TIERS.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setTier(id)}
                className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-input bg-background text-sm font-bold hover:border-[#00A3E0] hover:bg-[#00A3E0]/5">
                <Icon className="h-6 w-6 text-[#20603D]" /> {label}
              </button>
            ))}
          </div>
        )}
        {tier === "country" && <NationalForm onBack={() => setTier(null)} />}
        {tier && tier !== "country" && <PlaceEntry key={tier} tier={tier} onBack={() => setTier(null)} />}
      </section>
    </main>
  );
}
