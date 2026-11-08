import assert from "node:assert/strict";
import testCase from "node:test";
import type { LocateSuccess } from "@/types/location";
import { getLocationNotificationTarget } from "./location-notifications";

function sample(level: LocateSuccess["level"]): LocateSuccess {
  return {
    status: "success",
    level,
    source: "gps",
    matches: [],
    leaders: [],
    hierarchy: {
      province: { scope_code: "RW-P1", name_kiny: "Amajyaruguru", confidence: 98 } as never,
      district: { scope_code: "RW-P1-D1", name_kiny: "Gicumbi", confidence: 97 } as never,
      sector: { scope_code: "RW-P1-D1-S1", name_kiny: "Byumba", confidence: 50 } as never,
      cell: { scope_code: "RW-P1-D1-S1-C1", name_kiny: "Kigarama", confidence: 20 } as never,
      village: { scope_code: "RW-P1-D1-S1-C1-V1", name_kiny: "Kabeza", confidence: 10 } as never,
    },
  };
}

testCase("notification path includes only levels supported by the engine", () => {
  const target = getLocationNotificationTarget(sample("district"));
  assert.ok(target);
  assert.equal(target.key, "RW-P1/RW-P1-D1");
  assert.equal(target.body, "Ubu uri: Intara: Amajyaruguru · Akarere: Gicumbi.");
});

testCase("moving to another supported district changes the notification identity", () => {
  const first = getLocationNotificationTarget(sample("district"));
  const secondData = sample("district");
  secondData.hierarchy.district = {
    ...secondData.hierarchy.district!,
    scope_code: "RW-P2-D2",
    name_kiny: "Musanze",
  };
  const second = getLocationNotificationTarget(secondData);
  assert.ok(first && second);
  assert.notEqual(first.key, second.key);
  assert.match(second.body, /Musanze/);
});

testCase("missing or country-only results do not create location notifications", () => {
  assert.equal(getLocationNotificationTarget(null), null);
  assert.equal(getLocationNotificationTarget(sample("country")), null);
});
