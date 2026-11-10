import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const assistantRoute = read("../../app/api/ishakiro/route.ts");
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
  assert.doesNotMatch(assistantComponent, /<Bot\\b|<Loader2\\b/);
});
