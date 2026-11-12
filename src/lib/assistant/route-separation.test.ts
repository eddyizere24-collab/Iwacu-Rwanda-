import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const assistantRoute = read("../../app/api/ishakiro/route.ts");
const usageLimits = read("./usage-limits.ts");
const legacyPlaceSearchRoute = read("../../app/api/ai-router/route.ts");
const assistantComponent = read("../../components/AiSearchAssistant.tsx");

test("Ishakiro conversation uses its own API route", () => {
  assert.ok(assistantRoute.includes("AssistantRequestSchema"));
  assert.ok(assistantRoute.includes("executeAssistantRequest"));
  assert.ok(assistantComponent.includes('fetch("/api/ishakiro"'));
  assert.doesNotMatch(assistantComponent, /fetch\(["']\/api\/ai-router["']/);
});

test("Ishakiro sends recent conversation turns to preserve session continuity", () => {
  assert.ok(assistantComponent.includes("history: recentHistory"));
  assert.ok(assistantComponent.includes("messages.slice(-8)"));
  assert.ok(assistantRoute.includes("AssistantRequestSchema"));
});

test("legacy ai-router remains the database-backed place-name search endpoint", () => {
  assert.ok(legacyPlaceSearchRoute.includes('supabase.rpc("search_places"'));
  assert.ok(legacyPlaceSearchRoute.includes("p_limit: 12"));
  assert.doesNotMatch(legacyPlaceSearchRoute, /executeAssistantRequest|AssistantRequestSchema/);
});


test("mobile Iwacu AI opens as a full-screen room and can be minimized", () => {
  assert.ok(assistantComponent.includes("fixed inset-0 z-[80]"));
  assert.ok(assistantComponent.includes("h-[100dvh]"));
  assert.ok(assistantComponent.includes('onFocus={() => {'));
  assert.ok(assistantComponent.includes("setIsExpanded(true)"));
  assert.ok(assistantComponent.includes("Subiza Iwacu AI hasi"));
  assert.ok(assistantComponent.includes("Fungura Iwacu AI kuri ecran yose"));
  assert.ok(assistantComponent.includes('<IwacuAISun size={34} className="sun-pulse" />'));
  assert.doesNotMatch(assistantComponent, /<Bot\b|<Loader2\b/);
  assert.ok(assistantComponent.includes('role={isExpanded ? "dialog" : undefined}'));
  assert.ok(assistantComponent.includes('aria-modal={isExpanded ? true : undefined}'));
  assert.ok(assistantComponent.includes("focusableSelector"));
  assert.ok(assistantComponent.includes("lastOutsideFocusRef"));
});

test("Ishakiro opens with its Rwanda identity, Imigongo surface and grouped starter journeys", () => {
  const styles = read("../../app/globals.css");
  const locale = read("../../lib/i18n.ts");
  assert.ok(assistantComponent.includes("Ishakiro ry"));
  assert.ok(assistantComponent.includes("Muraho, ndi Ishakiro"));
  assert.ok(assistantComponent.includes("STARTER_GROUPS"));
  assert.ok(assistantComponent.includes("Sobanukirwa IWACU"));
  assert.ok(assistantComponent.includes("Ubumenyi ku Rwanda"));
  assert.ok(assistantComponent.includes("Abayobozi n'ubutabazi"));
  assert.ok(styles.includes(".iwacu-isha-header"));
  assert.ok(styles.includes(".iwacu-isha-question-group"));
  assert.ok(styles.includes("Imigongo"));
  assert.ok(locale.includes('"Sobanukirwa IWACU": "About IWACU"'));
  assert.ok(locale.includes('"Sobanukirwa IWACU": "À propos d\'IWACU"'));
});

test("optional model calls reserve a shared daily budget before execution", () => {
  const reservation = assistantRoute.indexOf("const reservation = await reserveAssistantModelUsage");
  const execution = assistantRoute.indexOf("executeAssistantRequest(parsed.data)");
  assert.ok(reservation > 0, "route must reserve shared daily usage");
  assert.ok(execution > reservation, "reservation must occur before any model-backed execution");
  assert.ok(assistantRoute.includes("getAssistantProviderReadiness().ready"));
  assert.ok(assistantRoute.includes("daily_global_limit"));
  assert.ok(usageLimits.includes('"backend_unavailable"'));
});
