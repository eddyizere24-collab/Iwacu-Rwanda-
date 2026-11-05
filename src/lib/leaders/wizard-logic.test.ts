// CHANGED 2026-11-05 CLAUDE: unit tests for the add-leader wizard rules; see docs/HANDOFF.md
import assert from "node:assert/strict";
import testCase from "node:test";
import {
  NOT_SUPPLIED_TEXT,
  buildEvidence,
  checkPersonName,
  findAlreadySaved,
  hasActiveHolder,
  levelChain,
} from "./wizard-logic";

testCase("national admin walks province to village for a village position", () => {
  const result = levelChain("country", "village");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.chain, ["province", "district", "sector", "cell", "village"]);
});

testCase("district admin only chooses below the own district", () => {
  const sector = levelChain("district", "sector");
  assert.equal(sector.ok && sector.chain.join(","), "sector");
  const village = levelChain("district", "village");
  assert.equal(village.ok && village.chain.join(","), "sector,cell,village");
});

testCase("position at the admin's own level needs no selection", () => {
  const same = levelChain("district", "district");
  assert.equal(same.ok && same.chain.length, 0);
  const national = levelChain("country", "country");
  assert.equal(national.ok && national.chain.length, 0);
});

testCase("an admin cannot place a leader above the own scope", () => {
  const result = levelChain("cell", "district");
  assert.deepEqual(result, { ok: false, reason: "root_too_deep" });
  assert.deepEqual(levelChain("sector", "country"), { ok: false, reason: "root_too_deep" });
  assert.deepEqual(levelChain("galaxy", "village"), { ok: false, reason: "unknown_level" });
});

testCase("an exclusive position with a pending or active holder is detected", () => {
  const rows = [
    { position_id: "p1", administrative_unit_id: "u1", appointment_status: "active" },
    { position_id: "p1", administrative_unit_id: "u2", appointment_status: "ended" },
    { position_id: "p2", administrative_unit_id: "u1", appointment_status: "archived" },
    { position_id: "p3", administrative_unit_id: "u3", appointment_status: "pending" },
  ];
  assert.equal(hasActiveHolder(rows, "p1", "u1"), true);
  assert.equal(hasActiveHolder(rows, "p1", "u2"), false);
  assert.equal(hasActiveHolder(rows, "p2", "u1"), false);
  assert.equal(hasActiveHolder(rows, "p3", "u3"), true);
});

testCase("missing evidence is labelled, never invented", () => {
  const result = buildEvidence({ type: "not_supplied", reference: "x", issuer: "y", issuedOn: "2026-01-01" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.evidence_type, "not_supplied");
    assert.equal(result.value.reference_number, NOT_SUPPLIED_TEXT);
    assert.equal(result.value.issuer, NOT_SUPPLIED_TEXT);
    assert.equal(result.value.issued_on, null);
  }
});

testCase("supplied evidence is trimmed and validated", () => {
  const ok = buildEvidence({ type: "appointment_letter", reference: "  REF-12 ", issuer: " Akarere ka X ", issuedOn: "" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.reference_number, "REF-12");
    assert.equal(ok.value.issuer, "Akarere ka X");
    assert.equal(ok.value.issued_on, null);
  }
  assert.equal(buildEvidence({ type: "appointment_letter", reference: "", issuer: "Akarere", issuedOn: "" }).ok, false);
  assert.equal(buildEvidence({ type: "appointment_letter", reference: "1", issuer: "A", issuedOn: "" }).ok, false);
  assert.equal(buildEvidence({ type: "appointment_letter", reference: "1", issuer: "Akarere", issuedOn: "12/01/2026" }).ok, false);
  assert.equal(buildEvidence({ type: "made_up", reference: "1", issuer: "Akarere", issuedOn: "" }).ok, false);
});

testCase("person names are normalised and digits rejected", () => {
  const ok = checkPersonName("  Jean   Claude ", " Mukamana ");
  assert.deepEqual(ok, { ok: true, first: "Jean Claude", last: "Mukamana" });
  assert.equal(checkPersonName("", "Mukamana").ok, false);
  assert.equal(checkPersonName("Eric", "").ok, false);
  assert.equal(checkPersonName("Eric2", "Mukamana").ok, false);
  assert.equal(checkPersonName("a".repeat(81), "Mukamana").ok, false);
});

testCase("a retry after an ambiguous failure finds the already saved appointment", () => {
  const rows = [
    {
      id: "a1",
      person_id: "pe1",
      position_id: "p1",
      appointment_status: "pending",
      person: { first_name: "Eric", last_name: "Mukamana" },
    },
    {
      id: "a2",
      person_id: "pe2",
      position_id: "p1",
      appointment_status: "ended",
      person: { first_name: "Alice", last_name: "Uwase" },
    },
  ];
  assert.equal(findAlreadySaved(rows, "p1", { first: " eric ", last: "MUKAMANA" })?.id, "a1");
  assert.equal(findAlreadySaved(rows, "p1", { personId: "pe1" })?.id, "a1");
  assert.equal(findAlreadySaved(rows, "p1", { first: "Alice", last: "Uwase" }), null);
  assert.equal(findAlreadySaved(rows, "p2", { first: "Eric", last: "Mukamana" }), null);
});
