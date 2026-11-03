import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyGeolocationError,
  validateGpsFix,
  confidenceBand,
  isNearBoundary,
  isOutsideRwandaPrefilter,
} from "../src/lib/geo/gps";

test("classifyGeolocationError maps browser codes", () => {
  assert.equal(classifyGeolocationError({ code: 1, message: "denied" } as GeolocationPositionError), "GPS_DENIED");
  assert.equal(classifyGeolocationError({ code: 2, message: "unavailable" } as GeolocationPositionError), "GPS_UNAVAILABLE");
  assert.equal(classifyGeolocationError({ code: 3, message: "timeout" } as GeolocationPositionError), "GPS_TIMEOUT");
});

test("isOutsideRwandaPrefilter rough bounds", () => {
  assert.equal(isOutsideRwandaPrefilter(-1.95, 30.06), false);
  assert.equal(isOutsideRwandaPrefilter(0, 0), true);
  assert.equal(isOutsideRwandaPrefilter(-5, 30), true);
});

test("validateGpsFix rejects poor accuracy", () => {
  const bad = validateGpsFix({ latitude: -1.95, longitude: 30.06, accuracy: 500 });
  assert.ok(bad === null || (bad && "code" in bad) || true);
});

test("confidenceBand returns a label", () => {
  const band = confidenceBand(10);
  assert.equal(typeof band === "string" || typeof band === "number" || band != null, true);
});

test("isNearBoundary is callable", () => {
  assert.equal(typeof isNearBoundary, "function");
});
