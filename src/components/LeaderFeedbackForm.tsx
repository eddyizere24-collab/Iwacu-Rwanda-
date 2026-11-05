"use client";

import { FormEvent, useState } from "react";

// CHANGED 2026-11-05 GROK: citizen feedback form (public); see docs/BUILD_M2_PUBLIC_LEADER_VIEW.md

type Props = {
  appointmentId?: string | null;
  administrativeUnitId?: string | null;
};

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "wrong_leader", label: "Si uyu muyobozi" },
  { value: "wrong_place", label: "Si aha hantu" },
  { value: "wrong_phone", label: "Telefone ntabwo ari yo" },
  { value: "other", label: "Ikindi" },
];

export function LeaderFeedbackForm({ appointmentId, administrativeUnitId }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("wrong_leader");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!appointmentId && !administrativeUnitId) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 1) {
      setErrorText("Andika ubutumwa bw'amagambo 1 kugeza 500.");
      return;
    }
    setStatus("sending");
    setErrorText(null);
    try {
      const response = await fetch("/api/leader-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentId ?? null,
          administrative_unit_id: administrativeUnitId ?? null,
          category,
          message: message.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(
          typeof payload?.message_kiny === "string"
            ? payload.message_kiny
            : "Ntibyashobotse kubika igitekerezo.",
        );
      }
      setStatus("sent");
      setMessage("");
    } catch (cause) {
      setStatus("error");
      setErrorText(cause instanceof Error ? cause.message : "Ntibyashobotse kubika igitekerezo.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 min-h-[44px] rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
      >
        Hari ikibazo kuri aya makuru?
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-bold text-foreground">Hari ikibazo kuri aya makuru?</p>
      <label className="block text-xs font-semibold text-foreground">
        Ubwoko
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm"
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-foreground">
        Ubutumwa
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          placeholder="Sobanura ikibazo mu magambo make..."
        />
      </label>
      {errorText && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
          {errorText}
        </p>
      )}
      {status === "sent" && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">
          Urakoze. Igitekerezo cyawe cyakiriwe.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-[44px] rounded-xl bg-[#20603D] px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          {status === "sending" ? "Turimo kohereza..." : "Ohereza"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setStatus("idle");
            setErrorText(null);
          }}
          className="min-h-[44px] rounded-xl border border-border px-4 text-xs font-semibold"
        >
          Funga
        </button>
      </div>
    </form>
  );
}
