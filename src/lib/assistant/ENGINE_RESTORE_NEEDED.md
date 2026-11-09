# ENGINE RESTORE REQUIRED

`src/lib/assistant/engine.ts` was corrupted during a tool upload (PLACEHOLDER).

**Correct fixed content is ready locally** (29106 bytes) with:
- `await createAssistantLanguageModelProvider()`
- `provider.plan({ messages, availableTools })`
- `place_facts` hierarchy routing via offline index
- Real scope codes RW-P1-D12 / RW-P1-D12-S1207

**Last good commit before corruption:** `50e230b371b6588b3fc80ecdb80e43b87f8980b1`

**Local place-facts tests:** 8/8 pass.

Restore steps: replace engine.ts with fixed file that includes model provider TS fix + place_facts wiring.
