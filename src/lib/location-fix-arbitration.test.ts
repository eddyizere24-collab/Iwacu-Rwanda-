import assert from "node:assert/strict";
import test from "node:test";
import {
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
