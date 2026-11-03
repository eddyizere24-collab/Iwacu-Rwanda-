"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, ShieldCheck, Smartphone, LogOut } from "lucide-react";
import { RwandanSun } from "@/components/RwandanSun";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "loading" | "setup" | "challenge" | "error";

type SessionPayload = {
  status?: string;
  code?: string;
  mfa_mode?: "setup" | "challenge";
  message_kiny?: string;
};

export default function AdminMfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          router.replace("/admin/login");
          return;
        }

        const sessionResponse = await fetch("/api/admin/leader-registry/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const sessionPayload = await sessionResponse.json().catch(() => null) as SessionPayload | null;

        if (sessionResponse.ok && sessionPayload?.status === "success") {
          router.replace("/admin/leader-registry");
          return;
        }
        if (sessionResponse.status !== 403 || sessionPayload?.code !== "MFA_REQUIRED") {
          router.replace("/admin/login");
          return;
        }

        const { data: assurance, error: assuranceError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance.currentLevel === "aal2") {
          router.replace("/admin/leader-registry");
          return;
        }

        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        // A verified TOTP factor means this is a sign-in challenge.
        const verifiedFactor = factors.totp[0];
        if (verifiedFactor) {
          const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
          if (challenge.error) throw challenge.error;
          if (!cancelled) {
            setFactorId(verifiedFactor.id);
            setChallengeId(challenge.data.id);
            setMode("challenge");
          }
          return;
        }

        // No verified factor exists: set up TOTP before granting National access.
        const enrollment = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "IWACU Rwanda National Admin",
        });
        if (enrollment.error) throw enrollment.error;

        if (!cancelled) {
          setFactorId(enrollment.data.id);
          setQrCode(enrollment.data.totp.qr_code);
          setSecret(enrollment.data.totp.secret);
          setMode("setup");
        }
      } catch {
        if (!cancelled) {
          setError("MFA ntishoboye gutegurwa. Ongera ugerageze cyangwa uve muri konti wongere winjire.");
          setMode("error");
        }
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Andika imibare 6 igaragara muri Authenticator app.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      let activeChallengeId = challengeId;

      if (mode === "setup") {
        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;
        activeChallengeId = challenge.data.id;
      }
      if (!factorId || !activeChallengeId) {
        throw new Error("MFA challenge is not ready.");
      }

      const verification = await supabase.auth.mfa.verify({
        factorId,
        challengeId: activeChallengeId,
        code: normalizedCode,
      });
      if (verification.error) throw verification.error;

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== "aal2") {
        throw new Error("MFA verification did not elevate the session.");
      }

      const sessionResponse = await fetch("/api/admin/leader-registry/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const sessionPayload = await sessionResponse.json().catch(() => null) as SessionPayload | null;
      if (!sessionResponse.ok || sessionPayload?.status !== "success") {
        throw new Error(sessionPayload?.message_kiny || "Konti ntiyemejwe nyuma ya MFA.");
      }

      router.replace("/admin/leader-registry");
      router.refresh();
    } catch {
      setError("Kode ntiyemewe cyangwa igihe cyayo cyarangiye. Reba Authenticator app wongere ugerageze.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-rwandan-gradient px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-sky-100 bg-card p-6 shadow-2xl dark:border-sky-900 sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center">
          <RwandanSun size={48} glow />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#00A3E0]/15 px-3 py-1 text-[11px] font-bold text-[#00A3E0]">
            <ShieldCheck className="h-3.5 w-3.5" /> IWACU RWANDA · SECURITY
          </span>
          <h1 className="mt-3 text-xl font-extrabold text-foreground">Kwemeza umutekano wa konti</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            National Super Admin agomba gukoresha MFA mbere yo guhabwa ububasha bwose.
          </p>
        </div>

        {mode === "loading" && (
          <div role="status" className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Turimo gutegura MFA...
          </div>
        )}

        {(mode === "setup" || mode === "challenge") && (
          <form onSubmit={verifyMfa} className="space-y-4">
            {mode === "setup" ? (
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Smartphone className="h-4 w-4 text-[#20603D]" /> Huza Authenticator app
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Fungura Google Authenticator, Microsoft Authenticator cyangwa indi TOTP app. Scan QR code. Iyo ukoresha telefone imwe, shyiramo secret iri hasi muri app.
                </p>
                {qrCode && (
                  <div className="flex justify-center rounded-xl bg-white p-3">
                    <img src={qrCode} alt="MFA setup QR code" className="h-44 w-44" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold">Secret yo kwinjiza muri Authenticator app</label>
                  <code className="block select-all break-all rounded-lg bg-muted p-3 text-xs">{secret}</code>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <KeyRound className="h-4 w-4 text-[#20603D]" /> Kode ya Authenticator
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Fungura Authenticator app, wandike kode nshya y'imibare 6.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="mfa-code" className="mb-1.5 block text-xs font-semibold text-foreground">Kode y'imibare 6</label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="min-h-[50px] w-full rounded-xl border border-input bg-background px-3 text-center text-lg font-bold tracking-[0.35em] outline-none focus:ring-2 focus:ring-[#00A3E0]"
                placeholder="000000"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || code.length !== 6 || !factorId}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Turimo kugenzura kode..." : "Emeza kandi ukomeze"}
            </button>
          </form>
        )}

        {mode === "error" && (
          <div className="space-y-3">
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
            <button onClick={() => window.location.reload()} className="min-h-[44px] w-full rounded-xl border border-border text-sm font-bold">
              Ongera ugerageze
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
          <Link href="/admin/login" className="text-[#00A3E0]">Subira ku kwinjira</Link>
          <button onClick={() => void signOut()} type="button" className="inline-flex min-h-[40px] items-center gap-1 text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sohoka
          </button>
        </div>
      </section>
    </main>
  );
}
