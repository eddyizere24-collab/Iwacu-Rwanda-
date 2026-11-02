import test from "node:test";
import assert from "node:assert/strict";
import { parseCreate, parsePatch, parseListQuery, nextStatus, canVerify, roleFitsLevel, toAdminLeader, type AdminContext } from "../src/lib/admin/leaders";
import type { ContactKindDef } from "../src/lib/contacts";

const kind = (code: string, link_template: string | null): ContactKindDef => ({
  code, label_kiny: code, label_eng: code, link_template, value_pattern: null, placeholder: null, sort_order: 1, is_active: true,
});
const ctx: AdminContext = {
  roles: new Map([
    ["Village Leader", { code: "Village Leader", level: "village", is_active: true }],
    ["Mayor", { code: "Mayor", level: "district", is_active: true }],
    ["Other", { code: "Other", level: null, is_active: true }],
    ["Isibo Leader", { code: "Isibo Leader", level: "village", is_active: true }],
    ["Retired Role", { code: "Retired Role", level: null, is_active: false }],
  ]),
  kinds: new Map([["phone", kind("phone", "tel:{value}")], ["email", kind("email", "mailto:{value}")]]),
};

const good = { scope_code: "RW-01-01-01-001", first_name: "  Aline ", last_name: "Mukamana", role: "Village Leader" };

test("create: valid input is trimmed; status/verification fields are rejected (no self-verification)", () => {
  const ok = parseCreate(good, ctx); assert.ok(ok.ok && ok.data.first_name === "Aline");
  for (const bad of [{ status: "verified" }, { verified_by: "x" }, { is_super_admin: true }, { version: 9 }, { created_by: "x" }, { phone_number: "0788123456" }, { user_id: "x" }]) {
    const r = parseCreate({ ...good, ...bad }, ctx); assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.errors[Object.keys(bad)[0]], "field not allowed");
  }
});

test("create: required fields, scope format, role, email, https photo", () => {
  const r = parseCreate({ scope_code: "rw-1", role: "King", email: "nope", photo_url: "http://x.y/a.png" }, ctx);
  assert.equal(r.ok, false);
  if (!r.ok) for (const k of ["scope_code", "first_name", "last_name", "role", "email", "photo_url"]) assert.ok(k in r.errors, k);
  assert.equal(parseCreate("x" as unknown, ctx).ok, false);
  assert.equal(parseCreate([] as unknown, ctx).ok, false);
});

test("create: email is lower-cased; a role added later by an admin is accepted; a retired role is not", () => {
  const r = parseCreate({ ...good, email: "A@B.rw" }, ctx);
  assert.ok(r.ok && r.data.email === "a@b.rw");
  assert.ok(parseCreate({ ...good, role: "Isibo Leader" }, ctx).ok);
  assert.equal(parseCreate({ ...good, role: "Retired Role" }, ctx).ok, false);
});

test("create: contacts are validated against the contact kinds and normalised", () => {
  const r = parseCreate({ ...good, contacts: [{ kind: "phone", value: "0788123456", is_primary: true }, { kind: "email", value: "X@y.rw" }] }, ctx);
  assert.ok(r.ok && r.data.contacts?.[0].value === "+250788123456" && r.data.contacts?.[1].value === "x@y.rw");
  const bad = parseCreate({ ...good, contacts: [{ kind: "fax", value: "123456" }] }, ctx);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok("contacts" in bad.errors);
});

const id = "3f2b8c1e-5d4a-4b7e-9c1a-0a1b2c3d4e5f";
test("patch: needs id + integer version; edits and actions cannot be mixed; empty patch refused", () => {
  assert.equal(parsePatch({ first_name: "A" }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 0, first_name: "A" }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1.5, first_name: "A" }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1 }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1, action: "verify", first_name: "A" }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1, action: "verify", contacts: [] }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1, action: "reject" }, ctx).ok, false);
  assert.ok(parsePatch({ id, version: 1, action: "reject", review_note: "no source" }, ctx).ok);
  assert.ok(parsePatch({ id, version: 2, action: "verify" }, ctx).ok);
  assert.equal(parsePatch({ id, version: 1, action: "promote" }, ctx).ok, false);
  assert.equal(parsePatch({ id, version: 1, status: "verified" }, ctx).ok, false);
});

test("patch: null clears optional fields, undefined leaves them; contacts: [] clears every contact", () => {
  const r = parsePatch({ id, version: 3, email: "" }, ctx);
  assert.ok(r.ok && r.data.fields.email === null && !("photo_url" in r.data.fields) && r.data.contacts === undefined);
  const c = parsePatch({ id, version: 3, contacts: [] }, ctx);
  assert.ok(c.ok && Array.isArray(c.data.contacts) && c.data.contacts.length === 0);
});

test("list query: defaults, bounds, allow-listed sort, bad values rejected", () => {
  const d = parseListQuery(new URLSearchParams()); assert.ok(d.ok && d.data.page === 1 && d.data.pageSize === 25 && !d.data.ascending);
  assert.equal(parseListQuery(new URLSearchParams("page_size=1000")).ok, false);
  assert.equal(parseListQuery(new URLSearchParams("page=0")).ok, false);
  assert.equal(parseListQuery(new URLSearchParams("sort=user_id")).ok, false);
  assert.equal(parseListQuery(new URLSearchParams("sort=id;drop")).ok, false);
  assert.equal(parseListQuery(new URLSearchParams("status=deleted")).ok, false);
  assert.equal(parseListQuery(new URLSearchParams("scope=RW-01%29")).ok, false);
  assert.ok(parseListQuery(new URLSearchParams("scope=RW-01-02&status=pending&sort=last_name&dir=asc")).ok);
});

test("status machine and four-eyes rule", () => {
  assert.equal(nextStatus("pending", "verify"), "verified");
  assert.equal(nextStatus("verified", "verify"), null);
  assert.equal(nextStatus("rejected", "verify"), null);
  assert.equal(nextStatus("pending", "reject"), "rejected");
  assert.equal(nextStatus("verified", "reject"), null);
  assert.equal(nextStatus("verified", "archive"), "archived");
  assert.equal(nextStatus("archived", "archive"), null);
  assert.equal(canVerify({ actorId: "a", createdBy: "a", isSuperAdmin: false }), false);
  assert.equal(canVerify({ actorId: "a", createdBy: "b", isSuperAdmin: false }), true);
  assert.equal(canVerify({ actorId: "a", createdBy: "a", isSuperAdmin: true }), true);
});

test("role must match its boundary level when the role has one", () => {
  const r = (c: string) => ctx.roles.get(c);
  assert.equal(roleFitsLevel(r("Village Leader"), "village"), true);
  assert.equal(roleFitsLevel(r("Village Leader"), "district"), false);
  assert.equal(roleFitsLevel(r("Mayor"), "district"), true);
  assert.equal(roleFitsLevel(r("Mayor"), "sector"), false);
  assert.equal(roleFitsLevel(r("Other"), "cell"), true);
  assert.equal(roleFitsLevel(undefined, "cell"), false);
});

test("API shape: embedded contacts become a sorted contacts list", () => {
  const out = toAdminLeader({
    id: "1",
    leader_contacts: [
      { kind: "email", value: "a@b.rw", label: null, is_primary: false, sort_order: 30 },
      { kind: "phone", value: "+250788123456", label: "Ibiro", is_primary: true, sort_order: 10 },
    ],
  }) as unknown as { contacts: { kind: string; is_primary: boolean }[]; leader_contacts?: unknown };
  assert.ok(!("leader_contacts" in out));
  assert.deepEqual(out.contacts.map((c) => c.kind), ["phone", "email"]);
  assert.equal(out.contacts[0].is_primary, true);
  assert.deepEqual((toAdminLeader({ id: "2" }) as unknown as { contacts: unknown[] }).contacts, []);
});
