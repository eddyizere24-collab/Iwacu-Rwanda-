import assert from "node:assert/strict";
import testCase from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { confidenceLabel } from "./confidence";
import { mergeOfficeCards, sanitizePublicDirectory, scopeChain } from "./public-directory";

testCase("supported_probability is translated to words only at the approved thresholds", () => {
  assert.equal(confidenceLabel(0.8), "Byizewe");
  assert.equal(confidenceLabel(0.79), "Giciriritse");
  assert.equal(confidenceLabel(0.5), "Giciriritse");
  assert.equal(confidenceLabel(0.49), "Gicye");
  assert.equal(confidenceLabel(undefined), "Gicye");
});

testCase("public directory allowlists fields, separates shared parents and deduplicates appointments", () => {
  const person = {
    appointment_id: "appointment-1",
    person_id: "person-1",
    display_name: "Umuyobozi",
    position: { code: "sector_head", title_kiny: "Ushinzwe", title_eng: "Officer", title_fra: "Agent" },
    appointment: { effective_from: "2026-01-01", effective_to: null, status: "approved" },
    profile: { biography: null, office_hours: null, service_priorities: null, photo_key: null, thumbnail_key: null },
    public_contacts: [],
    phone_raw: "+250700000000",
    email: "private@example.test",
    admin_dossier: { internal_notes: "private" },
  };
  const response = sanitizePublicDirectory({
    candidates: [{
      place: { id: "unit-cell", scope_code: "RW-01-01-01-01", name_kiny: "Akagari", name_eng: null, level: "cell" },
      leaders: [],
    }],
    shared_leaders: [
      { ...person, place: { id: "unit-sector", scope_code: "RW-01-01-01", name_kiny: "Umurenge", name_eng: null, level: "sector" } },
      { ...person, place: { id: "unit-sector", scope_code: "RW-01-01-01", name_kiny: "Umurenge", name_eng: null, level: "sector" } },
    ],
  }, new Map([["RW-01-01-01-01", 0.95]]));

  assert.equal(response.candidates[0].confidence, "Byizewe");
  assert.equal(response.candidates[0].place.level, "cell");
  assert.equal(response.shared_leaders.length, 1);
  const payload = JSON.stringify(response);
  assert.doesNotMatch(payload, /phone_raw|admin_dossier|internal_notes|private@example\.test/);
  assert.equal(response.shared_leaders[0].place.level, "sector");
});

testCase("empty directory produces a visible not-yet-completed message", () => {
  const response = sanitizePublicDirectory({ candidates: [], shared_leaders: [] }, new Map());
  assert.equal(response.message_kiny, "Amakuru y'umuyobozi ntaruzuzwa");
});

testCase("candidate API uses one bounded V2 RPC with a 2s timeout and no legacy leader-table query", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/leader-directory/route.ts"), "utf8");
  assert.match(route, /get_leader_candidates_v2/);
  const compactRoute = route.replace(/\s+/g, "");
  assert.ok(compactRoute.includes("setTimeout(()=>controller.abort(),2000)"));
  assert.match(route, /\.abortSignal\(controller\.signal\)/);
  assert.match(route, /candidates:\s*z\.array\(CandidateInput\)\.min\(1\)\.max\(3\)/);
  assert.match(route, /sanitizePublicDirectory/);
  assert.match(route, /unavailable:\s*true/);
  assert.doesNotMatch(route, /\.from\(["']leaders["']\)/);
  // The only other read is the bounded public office-card function, on the same abort signal, and its failure never hides registry leaders.
  assert.match(route, /get_public_unit_leaders_v1[\s\S]{0,80}abortSignal\(controller\.signal\)/);
  assert.doesNotMatch(route, /\.from\(["']office_unit_leaders["']\)/);
});

testCase("verification date passes only as a plain date; anything else means not yet verified", () => {
  const base = {
    appointment_id: "a1",
    person_id: "p1",
    display_name: "Umuyobozi",
    position: {},
    profile: {},
    public_contacts: [],
  };
  const place = { id: "u1", scope_code: "RW-1", name_kiny: "Hano", level: "village" };
  const read = (verified: unknown) =>
    sanitizePublicDirectory(
      { candidates: [{ place, leaders: [{ ...base, appointment: { status: "approved", verified_at: verified } }] }] },
      new Map(),
    ).candidates[0].leaders[0].appointment.verified_at;
  assert.equal(read("2026-11-05T09:30:00+00:00"), "2026-11-05T09:30:00+00:00");
  assert.equal(read("2026-11-05"), "2026-11-05");
  assert.equal(read("<script>alert(1)</script>"), null);
  assert.equal(read(12345), null);
  assert.equal(read(undefined), null);
});

testCase("office cards fill empty places, never replace registry leaders, and are never marked verified", () => {
  const place = { id: "u1", scope_code: "RW-P5-D57-S5701-C570105", name_kiny: "Kagomasi", name_eng: null, level: "cell" };
  const base = { status: "success" as const, unavailable: false as const, message_kiny: null, shared_leaders: [],
    candidates: [{ place, confidence: confidenceLabel(0.9), leaders: [] }] };
  const cards = [
    { scope_code: "RW-P5-D57-S5701-C570105", level: "cell", unit_name: "Kagomasi", display_name: "Test Cell", job_title: null, phone: "+250788000001", public_email: null, bio: null, office_hours: null },
    { scope_code: "RW-P5-D57-S5701", level: "sector", unit_name: "Gashora", display_name: "Test Sector", job_title: "Umunyamabanga", phone: null, public_email: null, bio: null, office_hours: null },
    { scope_code: "RW-P5", level: "province", unit_name: "X", display_name: "Nobody", job_title: null, phone: null, public_email: null, bio: null, office_hours: null },
    { scope_code: "bad code", display_name: "Bad" },
  ];
  const merged = mergeOfficeCards(base, cards);
  assert.equal(merged.candidates[0].leaders.length, 1);
  assert.equal(merged.candidates[0].leaders[0].display_name, "Test Cell");
  assert.equal(merged.candidates[0].leaders[0].appointment.verified_at, null);
  assert.equal(merged.candidates[0].leaders[0].position.title_kiny, "Umunyamabanga Nshingwabikorwa w'Akagari");
  assert.deepEqual(merged.candidates[0].leaders[0].public_contacts, [{ type: "phone", label: null, value: "+250788000001" }]);
  assert.deepEqual(merged.shared_leaders.map((l) => l.display_name), ["Test Sector"]);

  const withRegistry = { ...base, candidates: [{ ...base.candidates[0], leaders: merged.candidates[0].leaders.map((l) => ({ ...l, appointment_id: "real" })) }] };
  assert.equal(mergeOfficeCards(withRegistry, cards).candidates[0].leaders[0].appointment_id, "real");
  assert.equal(mergeOfficeCards(base, "junk").candidates[0].leaders.length, 0);
  assert.deepEqual(scopeChain("RW-P5-D57-S5701-C570105"), ["RW-P5-D57", "RW-P5-D57-S5701", "RW-P5-D57-S5701-C570105"]);
});
