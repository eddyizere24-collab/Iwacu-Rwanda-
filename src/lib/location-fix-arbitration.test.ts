import assert from "node:assert/strict";
import test from "node:test";
import {
  isDuplicateDeviceFix,
  locationFixesDisagree,
  shouldPreferHighAccuracyRequest,
  type LocationFixSummary,
} from "./location-fix-arbitration";

const lowPower: LocationFixSummary = {
  latitude: -1.9500,
  longitude: 30.0600,
  accuracyMeters: 100,
  requestMode: "low-power",
};

test("prefers a bounded high-accuracy-request result when the two coordinates conflict", () => {
  const highAccuracy: LocationFixSummary = {
    latitude: -2.3000,
    longitude: 30.3000,
    accuracyMeters: 180,
    requestMode: "high-accuracy",
  };
  assert.equal(locationFixesDisagree(lowPower, highAccuracy), true);
  assert.equal(shouldPreferHighAccuracyRequest(lowPower, highAccuracy), true);
});

test("does not call nearby readings a conflict", () => {
  const nearby: LocationFixSummary = {
    ...lowPower,
    latitude: -1.9501,
    longitude: 30.0601,
    requestMode: "high-accuracy",
  };
  assert.equal(locationFixesDisagree(lowPower, nearby), false);
  assert.equal(shouldPreferHighAccuracyRequest(lowPower, nearby), false);
});

test("does not promote a high-accuracy-request result with a very wide radius", () => {
  const uncertain: LocationFixSummary = {
    latitude: -2.3000,
    longitude: 30.3000,
    accuracyMeters: 5_000,
    requestMode: "high-accuracy",
  };
  assert.equal(locationFixesDisagree(lowPower, uncertain), true);
  assert.equal(shouldPreferHighAccuracyRequest(lowPower, uncertain), false);
});

test("does not reverse the preference and promote a low-power result", () => {
  const highAccuracy: LocationFixSummary = {
    latitude: -1.9500,
    longitude: 30.0600,
    accuracyMeters: 100,
    requestMode: "high-accuracy",
  };
  const lowPowerDifferent: LocationFixSummary = {
    latitude: -2.3000,
    longitude: 30.3000,
    accuracyMeters: 80,
    requestMode: "low-power",
  };
  assert.equal(shouldPreferHighAccuracyRequest(highAccuracy, lowPowerDifferent), false);
});

test("rejects invalid coordinates from conflict arbitration", () => {
  const invalid: LocationFixSummary = {
    latitude: 120,
    longitude: 30,
    accuracyMeters: 10,
    requestMode: "high-accuracy",
  };
  assert.equal(locationFixesDisagree(lowPower, invalid), false);
  assert.equal(shouldPreferHighAccuracyRequest(lowPower, invalid), false);
});


test("deduplicates overlapping browser callbacks for the same place", () => {
  const secondCallback: LocationFixSummary = {
    ...lowPower,
    latitude: -1.95001,
    longitude: 30.06001,
    accuracyMeters: 105,
    requestMode: "high-accuracy",
  };
  assert.equal(isDuplicateDeviceFix(lowPower, secondCallback, 1_000, 2_000), true);
});

test("allows the same place when the later phone fix materially improves accuracy", () => {
  const better: LocationFixSummary = {
    ...lowPower,
    latitude: -1.95001,
    longitude: 30.06001,
    accuracyMeters: 50,
    requestMode: "high-accuracy",
  };
  assert.equal(isDuplicateDeviceFix(lowPower, better, 1_000, 2_000), false);
});

test("allows a new location when the user has moved", () => {
  const moved: LocationFixSummary = {
    latitude: -1.9510,
    longitude: 30.0610,
    accuracyMeters: 100,
    requestMode: "high-accuracy",
  };
  assert.equal(isDuplicateDeviceFix(lowPower, moved, 1_000, 2_000), false);
});

test("stops deduplicating after four seconds", () => {
  assert.equal(isDuplicateDeviceFix(lowPower, lowPower, 1_000, 5_001), false);
});
