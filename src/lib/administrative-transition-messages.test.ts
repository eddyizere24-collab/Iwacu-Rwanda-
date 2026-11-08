import assert from "node:assert/strict";
import testCase from "node:test";
import { buildAdministrativeTransitionMessages } from "./administrative-transition-messages";

const names = new Map<string, string>([
  ["RW-P1", "Intara A"],
  ["RW-P1-D1", "Akarere A"],
  ["RW-P1-D1-S1", "Umurenge A"],
  ["RW-P1-D1-S1-C1", "Akagari A"],
  ["RW-P1-D1-S1-C1-V1", "Umudugudu A"],
  ["RW-P1-D1-S1-C1-V2", "Umudugudu B"],
  ["RW-P1-D1-S2", "Umurenge B"],
  ["RW-P1-D1-S2-C2", "Akagari B"],
  ["RW-P1-D1-S2-C2-V3", "Umudugudu C"],
  ["RW-P2", "Intara B"],
  ["RW-P2-D2", "Akarere B"],
  ["RW-P2-D2-S3", "Umurenge C"],
  ["RW-P2-D2-S3-C4", "Akagari C"],
  ["RW-P2-D2-S3-C4-V5", "Umudugudu D"],
]);

testCase("moving between villages in the same cell sends one exit and one welcome", () => {
  const messages = buildAdministrativeTransitionMessages(
    "RW-P1-D1-S1-C1-V1",
    "RW-P1-D1-S1-C1-V2",
    names
  );
  assert.deepEqual(messages.map((item) => [item.phase, item.level]), [
    ["exit", "village"],
    ["welcome", "village"],
  ]);
  assert.match(messages[0].body, /Umudugudu A/);
  assert.match(messages[1].title, /Umudugudu B/);
});

testCase("crossing a sector boundary sends exit and welcome for every changed level", () => {
  const messages = buildAdministrativeTransitionMessages(
    "RW-P1-D1-S1-C1-V1",
    "RW-P1-D1-S2-C2-V3",
    names
  );
  assert.deepEqual(messages.map((item) => [item.phase, item.level]), [
    ["exit", "sector"], ["welcome", "sector"],
    ["exit", "cell"], ["welcome", "cell"],
    ["exit", "village"], ["welcome", "village"],
  ]);
  assert.match(messages[0].body, /Umurenge A/);
  assert.match(messages[1].body, /Umurenge B/);
});

testCase("crossing a district and province boundary sends all five levels", () => {
  const messages = buildAdministrativeTransitionMessages(
    "RW-P1-D1-S1-C1-V1",
    "RW-P2-D2-S3-C4-V5",
    names
  );
  assert.equal(messages.length, 10);
  assert.deepEqual(messages.filter((item) => item.phase === "exit").map((item) => item.level), [
    "province", "district", "sector", "cell", "village",
  ]);
  assert.deepEqual(messages.filter((item) => item.phase === "welcome").map((item) => item.level), [
    "province", "district", "sector", "cell", "village",
  ]);
});

testCase("first confirmed location sends welcome messages without false exit messages", () => {
  const messages = buildAdministrativeTransitionMessages(null, "RW-P1-D1-S1-C1-V1", names);
  assert.equal(messages.length, 5);
  assert.ok(messages.every((item) => item.phase === "welcome"));
});

testCase("unchanged village path does not send duplicate transition messages", () => {
  assert.deepEqual(
    buildAdministrativeTransitionMessages(
      "RW-P1-D1-S1-C1-V1",
      "RW-P1-D1-S1-C1-V1",
      names
    ),
    []
  );
});
