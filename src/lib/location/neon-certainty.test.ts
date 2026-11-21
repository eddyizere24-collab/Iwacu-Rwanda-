import assert from "node:assert/strict";
import test from "node:test";
import { isNeonCertaintyConfigured, neonCertaintyLookup } from "./neon-certainty";

const env = { NEON_ICYIZERE_DATABASE_URL: "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db" } as unknown as NodeJS.ProcessEnv;

test("only neon hosts count as configured", () => {
  assert.equal(isNeonCertaintyConfigured(env), true);
  assert.equal(isNeonCertaintyConfigured({} as NodeJS.ProcessEnv), false);
  assert.equal(isNeonCertaintyConfigured({ NEON_ICYIZERE_DATABASE_URL: "postgresql://u:p@evil.example.com/db" } as unknown as NodeJS.ProcessEnv), false);
});

test("returns the jsonb result and maps failures to an error without throwing", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ rows: [{ r: { needed_m: 35, levels: {} } }] }), { status: 200 })) as typeof fetch;
    const ok = await neonCertaintyLookup(30.06, -1.93, 10, new AbortController().signal, env);
    assert.deepEqual(ok, { data: { needed_m: 35, levels: {} }, error: null });
    globalThis.fetch = (async () => new Response("x", { status: 500 })) as typeof fetch;
    const bad = await neonCertaintyLookup(30.06, -1.93, 10, new AbortController().signal, env);
    assert.equal(bad.data, null);
    assert.equal(bad.error?.message, "neon_http_500");
    globalThis.fetch = (async () => { throw new Error("down"); }) as typeof fetch;
    const down = await neonCertaintyLookup(30.06, -1.93, 10, new AbortController().signal, env);
    assert.equal(down.error?.message, "neon_unreachable");
  } finally {
    globalThis.fetch = original;
  }
});
