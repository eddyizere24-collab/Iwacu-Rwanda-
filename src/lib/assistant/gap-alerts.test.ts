import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../../sql/migrations/20261110_02_assistant_gap_alerts.sql", import.meta.url), "utf8");
const api = readFileSync(new URL("../../app/api/admin/office/gaps/route.ts", import.meta.url), "utf8");
const office = readFileSync(new URL("../../app/admin/ibiro/page.tsx", import.meta.url), "utf8");
const engine = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");

test("missing information is routed to scoped authority accounts, with a national fallback", () => {
  assert.ok(migration.includes("assistant_gap_alerts"));
  assert.ok(migration.includes("nearest_local"));
  assert.ok(migration.includes("district_authority"));
  assert.ok(migration.includes("national_fallback"));
  assert.ok(migration.includes("OPERATOR(extensions.<@)"));
  assert.ok(migration.includes("grant execute on function public.record_assistant_gap_v1(text, text) to service_role"));
  assert.ok(migration.includes("grant execute on function public.list_assistant_gap_alerts_v1(integer) to authenticated"));
  assert.ok(migration.includes("grant execute on function public.update_assistant_gap_alert_v1(uuid, text) to authenticated"));
  assert.ok(migration.includes("recipient_user_id = auth.uid()"));
  assert.doesNotMatch(migration, /question\s+text|query\s+text|phone\s+text|ip_address\s+inet|visitor_id\s+uuid/i);
});

test("authority alerts have an authenticated, scoped read/update API and office UI", () => {
  assert.ok(api.includes("requireLeaderAdmin"));
  assert.ok(api.includes('"list_assistant_gap_alerts_v1"'));
  assert.ok(api.includes('"update_assistant_gap_alert_v1"'));
  assert.ok(office.includes('api<{ alerts: GapAlert[] }>("/api/admin/office/gaps")'));
  assert.ok(office.includes("Amakuru abura"));
  assert.ok(office.includes("Tangira kubikurikirana"));
  assert.ok(office.includes("Emeza ko byakemutse"));
});

test("the assistant invokes the gap recorder when official data is missing", () => {
  assert.ok(engine.includes('recordAssistantGap("leader_missing"'));
  assert.ok(engine.includes('recordAssistantGap("contact_missing"'));
  assert.ok(engine.includes('recordAssistantGap("place_not_found"'));
  assert.ok(engine.includes('recordAssistantGap("capability_data_missing"'));
});
