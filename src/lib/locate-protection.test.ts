import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocateCacheKey,
  callRpcWithTimeout,
  createHttp200Fallback,
  createInMemoryCache,
  createIpRateLimiter,
  getAccuracyBucket,
  getLocateConfidenceRpcName,
} from "./locate-protection";

test("coordinate cache misses once, then serves a cached hit without another RPC", async () => {
  const cache = createInMemoryCache<{ result: string }>({ ttlMs: 600_000 });
  const key = buildLocateCacheKey({
    latitude: -1.9441,
    longitude: 30.0619,
    accuracy: 35,
    method: "gps",
  });
  let mockedRpcCalls = 0;

  assert.equal(cache.get(key), undefined, "first lookup is a cache miss");
  mockedRpcCalls += 1;
  cache.set(key, { result: "district-result" });

  assert.deepEqual(cache.get(key), { result: "district-result" }, "second lookup is a cache hit");
  assert.equal(mockedRpcCalls, 1, "the mock RPC is called only for the miss");
});

test("cache key rounds latitude and longitude to four decimals and includes accuracy bucket", () => {
  const first = buildLocateCacheKey({
    latitude: -1.94414,
    longitude: 30.06194,
    accuracy: 35,
    method: "gps",
  });
  const sameRoundedPoint = buildLocateCacheKey({
    latitude: -1.94413,
    longitude: 30.06193,
    accuracy: 42,
    method: "gps",
  });
  const differentAccuracyBucket = buildLocateCacheKey({
    latitude: -1.94414,
    longitude: 30.06194,
    accuracy: 75,
    method: "gps",
  });

  assert.equal(first, "-1.9441:30.0619:50:gps");
  assert.equal(first, sameRoundedPoint);
  assert.notEqual(first, differentAccuracyBucket);
  assert.equal(getAccuracyBucket(35), 50);
  assert.equal(getAccuracyBucket(75), 100);
});

test("per-IP limiter permits exactly 30 requests in a 60-second window", () => {
  let now = 1_000;
  const limiter = createIpRateLimiter({
    limit: 30,
    windowMs: 60_000,
    now: () => now,
  });

  for (let request = 1; request <= 30; request += 1) {
    assert.equal(limiter.consume("203.0.113.7"), true, `request ${request} should be allowed`);
  }
  assert.equal(limiter.consume("203.0.113.7"), false, "request 31 is blocked");
  assert.equal(limiter.consume("203.0.113.8"), true, "a different IP has its own window");

  now += 60_001;
  assert.equal(limiter.consume("203.0.113.7"), true, "the IP is allowed after the window expires");
});

test("a mocked RPC timeout aborts the request and produces HTTP 200 with degraded:true", async () => {
  let signalAborted = false;
  const outcome = await callRpcWithTimeout(
    (signal) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        signalAborted = true;
        reject(new Error("aborted by timeout"));
      }, { once: true });
    }),
    5,
  );

  assert.equal(outcome.kind, "timeout");
  assert.equal(signalAborted, true);
  const response = createHttp200Fallback(
    { status: "success", source: "prior", flags: ["degraded"] },
    true,
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.degraded, true);
  assert.equal(response.body.status, "success");
});

test("a mocked RPC failure is converted to an HTTP 200 fallback, not an error page", async () => {
  const outcome = await callRpcWithTimeout(
    async () => {
      throw new Error("mock RPC unavailable");
    },
    100,
  );

  assert.equal(outcome.kind, "error");
  if (outcome.kind === "error") {
    assert.match(String(outcome.error), /mock RPC unavailable/);
  }

  const response = createHttp200Fallback({
    status: "success",
    source: "prior",
    flags: ["rwanda_classifier_unavailable"],
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "success");
});

test("confidence RPC defaults to v2 and keeps v1 explicitly selectable", () => {
  assert.equal(getLocateConfidenceRpcName(undefined), "calculate_location_confidence_v2");
  assert.equal(getLocateConfidenceRpcName(""), "calculate_location_confidence_v2");
  assert.equal(getLocateConfidenceRpcName("v2"), "calculate_location_confidence_v2");
  assert.equal(getLocateConfidenceRpcName(" V2 "), "calculate_location_confidence_v2");
  assert.equal(getLocateConfidenceRpcName("v1"), "calculate_location_confidence");
  assert.equal(getLocateConfidenceRpcName(" V1 "), "calculate_location_confidence");
  assert.equal(getLocateConfidenceRpcName("anything-else"), "calculate_location_confidence_v2");
});
