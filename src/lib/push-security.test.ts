import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedPushEndpoint,
  isSameOriginRequest,
  normalizeNotificationTag,
} from "./push-security";

test("accepts known browser push-service hosts over HTTPS", () => {
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
  assert.equal(isAllowedPushEndpoint("https://web.push.apple.com/abc"), true);
});

test("rejects non-push hosts, HTTP, credentials, and unusual ports", () => {
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), false);
  assert.equal(isAllowedPushEndpoint("https://example.com/push"), false);
  assert.equal(isAllowedPushEndpoint("https://user:pass@fcm.googleapis.com/push"), false);
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/push"), false);
});

test("accepts same-origin requests only", () => {
  assert.equal(isSameOriginRequest("https://iwacu.example/api/push", "https://iwacu.example"), true);
  assert.equal(isSameOriginRequest("https://iwacu.example/api/push", "https://evil.example"), false);
  assert.equal(isSameOriginRequest("https://iwacu.example/api/push", null), false);
});

test("normalizes tags to a safe, short push topic", () => {
  assert.equal(normalizeNotificationTag("entered:RW-P1-D1"), "entered-RW-P1-D1");
  assert.ok(normalizeNotificationTag("x".repeat(100)).length <= 32);
});
