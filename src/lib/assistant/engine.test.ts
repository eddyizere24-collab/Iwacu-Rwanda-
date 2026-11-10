import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssistantRequestSchema } from "./contracts";
import { runAssistant } from "./engine";

describe("Ishakiro direct answers", () => {
  it("answers who the assistant is in Kinyarwanda", async () => {
    const request = AssistantRequestSchema.parse({ query: "Urinde?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "identity");
    assert.match(reply.answer_kiny, /Ishakiro.*IWACU RWANDA/i);
    assert.match(reply.answer_kiny, /nt.*mpimbe|ntabwo.*mpimbe/i);
  });

  it("answers Rwanda-wide district count from the checked administrative index", async () => {
    const request = AssistantRequestSchema.parse({ query: "Mu Rwanda hari uturere tungahe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "national_facts");
    assert.equal(reply.status, "success");
    assert.match(reply.answer_kiny, /30 uturere/);
    assert.match(reply.answer_kiny, /4 intara/);
    assert.match(reply.answer_kiny, /Umujyi wa Kigali 1/);
    assert.match(reply.answer_kiny, /416 imirenge/);
    assert.match(reply.answer_kiny, /2,148 utugari/);
    assert.match(reply.answer_kiny, /14,837 imidugudu/);
    assert.match(reply.confidence_label ?? "", /Guverinoma y.u Rwanda/);
    assert.match(reply.sources?.[0]?.url ?? "", /gov\\.rw/);
  });

  it("answers a national province count when asked", async () => {
    const request = AssistantRequestSchema.parse({ query: "U Rwanda rufite intara zingahe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "national_facts");
    assert.match(reply.answer_kiny, /4 intara/);
    assert.match(reply.answer_kiny, /Umujyi wa Kigali.*si intara/);
  });
});
