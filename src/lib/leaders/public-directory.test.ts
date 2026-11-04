import assert from "node:assert/strict";
import testCase from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { confidenceLabel } from "./confidence";
import { sanitizePublicDirectory } from "./public-directory";

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
});
