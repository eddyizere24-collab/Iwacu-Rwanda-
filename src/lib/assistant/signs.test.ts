import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupNearbySigns } from "./signs";

describe("signs", () => {
  it("returns unavailable and empty list", () => {
    const result = lookupNearbySigns("ibyapa hafi ya Kacyiru");
    assert.equal(result.status, "unavailable");
    assert.equal(result.signs.length, 0);
    assert.match(result.message_kiny, /Ntabwo nzahimba/i);
  });

  it("does not invent signs for any query", () => {
    const result = lookupNearbySigns("Show road signs near Gasabo");
    assert.equal(result.signs.length, 0);
    assert.equal(result.status, "unavailable");
  });
});
