import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupNearbySigns } from "./signs";

describe("signs", () => {
  it("provides the verified legal context but no unverified nearby signs", () => {
    const result = lookupNearbySigns("ibyapa hafi ya Kacyiru");
    assert.equal(result.status, "unavailable");
    assert.equal(result.signs.length, 0);
    assert.match(result.message_kiny, /Itegeko n° 014\/2026/);
    assert.match(result.message_kiny, /Ingingo ya 5/);
    assert.equal(result.data_date, "2026-03-10");
    assert.match(result.source_url, /^https:\/\//);
    assert.match(result.source_label, /Igazeti ya Leta/);
  });

  it("does not invent sign names or locations for any query", () => {
    const result = lookupNearbySigns("Show road signs near Gasabo");
    assert.deepEqual(result.signs, []);
    assert.equal(result.status, "unavailable");
    assert.match(result.message_kiny, /Ntabwo nshobora kwemeza icyapa/i);
  });
});
