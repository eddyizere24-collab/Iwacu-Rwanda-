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

test("chat composer stays visible while only the conversation transcript scrolls", () => {
  assert.ok(assistantComponent.includes("h-[82dvh] min-h-[460px] max-h-[780px] flex-col"));
  assert.ok(assistantComponent.includes('className="flex min-h-0 flex-1 flex-col bg-[#F7FAF8]'));
  assert.ok(assistantComponent.includes("min-h-0 flex-1 space-y-4 overflow-y-auto"));
  assert.ok(assistantComponent.includes('<form onSubmit={handleFormSubmit} className="mt-3 shrink-0'));
  assert.ok(!assistantComponent.includes("max-h-[48vh]"));
});

test("legacy ai-router remains the database-backed place-name search endpoint", () => {
  assert.ok(legacyPlaceSearchRoute.includes('supabase.rpc("search_places"'));
  assert.ok(legacyPlaceSearchRoute.includes("p_limit: 12"));
  assert.doesNotMatch(legacyPlaceSearchRoute, /executeAssistantRequest|AssistantRequestSchema/);
});
