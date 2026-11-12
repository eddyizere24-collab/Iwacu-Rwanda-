import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  normalizeAccessibilitySettings,
} from "./AccessibilityProvider";

test("accessibility preferences default to the existing IWACU presentation", () => {
  assert.deepEqual(normalizeAccessibilitySettings(null), DEFAULT_ACCESSIBILITY_SETTINGS);
  assert.deepEqual(normalizeAccessibilitySettings(undefined), DEFAULT_ACCESSIBILITY_SETTINGS);
});

test("valid preferences are retained", () => {
  assert.deepEqual(
    normalizeAccessibilitySettings({
      textScale: "200",
      highContrast: true,
      reducedMotion: true,
      lowDataMode: true,
      easyUseMode: true,
    }),
    {
      textScale: "200",
      highContrast: true,
      reducedMotion: true,
      lowDataMode: true,
      easyUseMode: true,
    },
  );
});

test("invalid or unknown stored values safely fall back to defaults", () => {
  assert.deepEqual(
    normalizeAccessibilitySettings({
      textScale: "900",
      highContrast: "yes",
      reducedMotion: 1,
      lowDataMode: false,
      easyUseMode: null,
      unexpectedOption: true,
    }),
    DEFAULT_ACCESSIBILITY_SETTINGS,
  );
});

test("a partially saved preference set is completed with safe defaults", () => {
  assert.deepEqual(
    normalizeAccessibilitySettings({ textScale: "150", highContrast: true }),
    {
      textScale: "150",
      highContrast: true,
      reducedMotion: false,
      lowDataMode: false,
      easyUseMode: false,
    },
  );
});
