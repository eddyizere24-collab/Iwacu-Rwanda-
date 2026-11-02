import { test } from "node:test";
import assert from "node:assert/strict";

test("smoke package loads", async () => {
  const mod = await import("../dist/index.js");
  assert.ok(typeof mod.encode === "function");
});
