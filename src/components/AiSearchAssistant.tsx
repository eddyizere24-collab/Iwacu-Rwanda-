"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles, Loader2, ArrowRight, CornerDownLeft, RotateCcw } from "lucide-react";
import { LeaderCard } from "@/components/LeaderCard";
import type { LeaderPublic } from "@/types/leader";
import { useI18n } from "@/components/LocaleProvider";

interface AiSearchResult {
  answer_kiny: string;
  answer?: string;
  matched_leaders: LeaderPublic[];
  jurisdiction_info?: Record<string, string>;
  suggestions: string[];
}

export function AiSearchAssistant() {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [locale]);

  const popularQueries = [
    "Ninde uyobora umurenge wa Kacyiru?",
    "Meya w'Akarere ka Gasabo ni nde?",
    "Umukuru w'umudugudu w'Ubumwe",
    "Akagari ka Kamatamu kayoborwa na nde?",
  ];

  async function handleSearch(searchQuery: string) {
    const textToSearch = searchQuery.trim();
    if (!textToSearch) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSearch, locale }),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setResult(json);
      } else {
        setError(json.message_kiny || "Ntibyashobotse kubona amakuru. Ongera ugerageze.");
      }
    } catch {
      setError("Ikibazo cy'urukurikirane mu gushakisha.");
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function handleChipClick(chipQuery: string) {
    setQuery(chipQuery);
    handleSearch(chipQuery);
  }

  function handleReset() {
    setQuery("");
    setResult(null);
    setError(null);
  }

  return (
    <section className="photo-wash-gorilla relative overflow-hidden rounded-[28px] border border-white/70 shadow-[0_18px_48px_rgba(6,35,26,0.16)]">
      {/* Header on a real photograph of the mountain gorillas of the Virunga volcanoes */}
      <div className="photo-surface photo-gorilla relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-12">
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAD201] text-[#06231A] shadow-sm sun-pulse">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Ishakiro ry'Ubuhanga
                </h2>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  AI
                </span>
              </div>
            </div>
          </div>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/60 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ongera ushake</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8">

      {/* Search Input Box */}
      <form onSubmit={handleFormSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Baza hano…"
            className="w-full min-h-[56px] rounded-2xl border-2 border-sky-200/90 bg-background pl-12 pr-28 text-xs sm:text-sm text-foreground shadow-inner placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-[#00A3E0] focus-visible:ring-4 focus-visible:ring-sky-400/20 dark:border-sky-800"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#00A3E0] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#0090c6] active:scale-95 disabled:opacity-40 transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Shaka</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Questions Suggestions */}
      {!result && !loading && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex flex-wrap gap-2">
            {popularQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(q)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-sky-200/70 bg-card px-3 py-1.5 text-xs text-foreground/90 transition-all hover:border-[#00A3E0] hover:bg-sky-50/50 dark:border-sky-900 dark:hover:bg-sky-950/40"
              >
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-6 py-8 text-center animate-in fade-in">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-[#00A3E0]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-foreground">Turimo gushaka…</p>
        </div>
      )}

      {/* AI Answer & Matching Leaders */}
      {result && !loading && (
        <div className="mt-6 space-y-5 animate-in fade-in">
          {/* AI Conversational Response Card */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/40">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00A3E0] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#00A3E0] mb-1">
                  Igisubizo cya AI
                </div>
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                  {result.answer ?? result.answer_kiny}
                </p>
              </div>
            </div>
          </div>

          {/* Matching Leaders Cards */}
          {result.matched_leaders && result.matched_leaders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Abayobozi babonetse muri aka gace ({result.matched_leaders.length}):
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.matched_leaders.map((leader) => (
                  <LeaderCard key={leader.id} leader={leader} />
                ))}
              </div>
            </div>
          )}

          {/* Follow-up suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <div className="flex flex-wrap gap-2">
                {result.suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(sug)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-border bg-card px-3 py-1 text-xs text-foreground/80 hover:text-foreground hover:border-[#00A3E0] hover:bg-sky-50/30"
                  >
                    <span>{sug}</span>
                    <CornerDownLeft className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
