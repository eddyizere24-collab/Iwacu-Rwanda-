"use client";

// PREVIEW-ONLY demo (feature/m4-workspaces). Shows the real office screens with invented sample data so the
// design can be reviewed without a login. Not merged to main. Nothing here touches the database.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Node = { scope: string; level: string; name: string; leader?: { name: string; title: string; phone: string; status: "active" | "invited" | "record" }; kids?: Node[] };

const L = (name: string, title: string, phone: string, status: "active" | "invited" | "record") => ({ name, title, phone, status });
const village = (scope: string, name: string, leader?: Node["leader"]): Node => ({ scope, level: "village", name, leader });
const TREE: Node[] = [
  { scope: "RW-P1", level: "province", name: "Umujyi wa Kigali", kids: [
    { scope: "RW-P1-D1", level: "district", name: "Gasabo", leader: L("Mukamana Alice", "Umuyobozi w'Akarere", "+250 788 000 001", "active"), kids: [
      { scope: "RW-P1-D1-S1", level: "sector", name: "Kimironko", leader: L("Uwase Jeanne", "Umunyamabanga Nshingwabikorwa", "+250 788 000 002", "active"), kids: [
        { scope: "RW-P1-D1-S1-C1", level: "cell", name: "Bibare", leader: L("Habimana Eric", "Umunyamabanga Nshingwabikorwa w'Akagari", "+250 788 000 003", "invited"), kids: [
          village("RW-P1-D1-S1-C1-V1", "Urugwiro", L("Nshimiye Paul", "Umukuru w'Umudugudu", "+250 788 111 222", "record")),
          village("RW-P1-D1-S1-C1-V2", "Amahoro"),
          village("RW-P1-D1-S1-C1-V3", "Izuba", L("Kamanzi Claire", "Umukuru w'Umudugudu", "+250 788 333 444", "record")),
        ] },
        { scope: "RW-P1-D1-S1-C2", level: "cell", name: "Nyagatovu", kids: [village("RW-P1-D1-S1-C2-V1", "Ubumwe")] },
      ] },
      { scope: "RW-P1-D1-S2", level: "sector", name: "Remera", leader: L("Mugisha David", "Umunyamabanga Nshingwabikorwa", "+250 788 000 004", "invited"), kids: [{ scope: "RW-P1-D1-S2-C1", level: "cell", name: "Rukiri I", kids: [village("RW-P1-D1-S2-C1-V1", "Ituze")] }] },
      { scope: "RW-P1-D1-S3", level: "sector", name: "Kacyiru", kids: [{ scope: "RW-P1-D1-S3-C1", level: "cell", name: "Kamatamu", kids: [village("RW-P1-D1-S3-C1-V1", "Inyange")] }] },
    ] },
    { scope: "RW-P1-D2", level: "district", name: "Kicukiro", leader: L("Niyonsenga Grace", "Umuyobozi w'Akarere", "+250 788 000 005", "active"), kids: [{ scope: "RW-P1-D2-S1", level: "sector", name: "Gikondo", kids: [{ scope: "RW-P1-D2-S1-C1", level: "cell", name: "Kinunga", kids: [village("RW-P1-D2-S1-C1-V1", "Rugari")] }] }] },
    { scope: "RW-P1-D3", level: "district", name: "Nyarugenge", leader: L("Twagirayezu Jean", "Umuyobozi w'Akarere", "+250 788 000 006", "invited"), kids: [{ scope: "RW-P1-D3-S1", level: "sector", name: "Nyamirambo", kids: [{ scope: "RW-P1-D3-S1-C1", level: "cell", name: "Mumena", kids: [village("RW-P1-D3-S1-C1-V1", "Gatare")] }] }] },
  ] },
  { scope: "RW-P2", level: "province", name: "Intara y'Amajyepfo", kids: [{ scope: "RW-P2-D1", level: "district", name: "Huye", kids: [] }, { scope: "RW-P2-D2", level: "district", name: "Muhanga", kids: [] }] },
  { scope: "RW-P3", level: "province", name: "Intara y'Iburengerazuba", kids: [{ scope: "RW-P3-D1", level: "district", name: "Rubavu", kids: [] }] },
  { scope: "RW-P4", level: "province", name: "Intara y'Amajyaruguru", kids: [{ scope: "RW-P4-D1", level: "district", name: "Musanze", kids: [] }] },
  { scope: "RW-P5", level: "province", name: "Intara y'Iburasirazuba", kids: [{ scope: "RW-P5-D1", level: "district", name: "Rwamagana", kids: [] }] },
];

function flat(nodes: Node[], parentName: string | null, out: { n: Node; parent: string | null }[] = []) {
  for (const n of nodes) { out.push({ n, parent: parentName }); flat(n.kids ?? [], n.name, out); }
  return out;
}
const ALL = flat(TREE, null);
const find = (scope: string) => ALL.find((x) => x.n.scope === scope)?.n;
const unitRow = (n: Node) => ({
  unit_id: "demo-" + n.scope, scope_code: n.scope, level: n.level, name_kiny: n.name, name_eng: n.name, child_count: (n.kids ?? []).length,
  leader_user_id: n.leader && n.leader.status !== "record" ? "u-" + n.scope : null,
  leader_name: n.leader?.name ?? null, leader_title: n.leader?.title ?? null, leader_phone: n.leader?.phone ?? null,
  leader_photo: null, leader_public: true, status: n.leader?.status ?? "vacant",
  can_edit: n.level !== "province", can_create_account: n.level === "district" && !n.leader,
});

const LEVELS_ORDER = ["district", "sector", "cell", "village"];
const BELOW: Record<string, string | null> = { country: "district", province: "district", district: "sector", sector: "cell", cell: "village", village: null };
function descendants(n: Node, out: Node[] = []) { for (const k of n.kids ?? []) { out.push(k); descendants(k, out); } return out; }
function ancestorsOf(scope: string) {
  const out: { scope_code: string; level: string; name: string }[] = [];
  const parts = scope.split("-");
  for (let i = 2; i < parts.length; i++) { const sc = parts.slice(0, i).join("-"); const f = find(sc); if (f) out.push({ scope_code: f.scope, level: f.level, name: f.name }); }
  return out;
}
const CASES = [
  { id: "c1", category: "wrong_phone", message: "Telefoni y'umuyobozi w'umudugudu ntabwo ikora.", status: "new", scope: "RW-P1-D1-S1-C1-V1", ago: 1 },
  { id: "c2", category: "wrong_leader", message: "Umuyobozi uvugwa si we uriho ubu.", status: "reviewing", scope: "RW-P1-D1-S1", ago: 3 },
  { id: "c3", category: "wrong_place", message: "Umudugudu wanjye ugaragara mu kagari katari ko.", status: "new", scope: "RW-P1-D1-S2-C1-V1", ago: 5 },
  { id: "c4", category: "other", message: "Nta muyobozi uboneka kuri uyu mudugudu.", status: "resolved", scope: "RW-P1-D1-S1-C1-V2", ago: 9 },
  { id: "c5", category: "wrong_phone", message: "Nimero ya telefoni ntiyuzuye.", status: "new", scope: "RW-P1-D2-S1-C1-V1", ago: 2 },
];
const caseRows = (scopeFilter: string | null, status: string | null) => CASES
  .filter((c) => inTop(c.scope) && (!scopeFilter || c.scope === scopeFilter || c.scope.startsWith(scopeFilter + "-")) && (!status || (status === "open" ? ["new", "reviewing"].includes(c.status) : c.status === status)))
  .map((c) => { const n = find(c.scope)!; const par = ALL.find((x) => x.n.scope === c.scope)?.parent ?? null;
    return { id: c.id, category: c.category, message: c.message, status: c.status, created_at: new Date(Date.now() - c.ago * 86400000).toISOString(), scope_code: c.scope, level: n.level, unit_name: n.name, parent_name: par, leader_name: n.leader?.name ?? null }; });
const TASKS = [
  { id: "t1", reference: "IM-2026-0001", title: "Raporo y'isuku mu mirenge yose", body: "Mwohereze raporo y'isuku y'ukwezi, harimo ibyakozwe n'ibitarakozwe.", priority: "high", due: 6, targets: ["RW-P1-D1", "RW-P1-D2", "RW-P1-D3"], st: ["submitted", "in_progress", "assigned"] },
  { id: "t2", reference: "IM-2026-0002", title: "Kuvugurura amazina y'abayobozi b'imidugudu", body: "Buri karere gasuzume ko amazina n'inimero za telefoni ari ukuri.", priority: "critical", due: -1, targets: ["RW-P1-D1", "RW-P1-D2"], st: ["approved", "assigned"] },
];
const taskRow = (k: (typeof TASKS)[number], view: string) => {
  const c = (x: string) => k.st.filter((v) => v === x).length;
  return { id: k.id, reference: k.reference, title: k.title, priority: k.priority, due_at: new Date(Date.now() + k.due * 86400000).toISOString(), status: "open", created_at: new Date().toISOString(),
    issuer_name: "Umuyobozi w'Urugero", targets: k.st.length, acknowledged: c("acknowledged"), in_progress: c("in_progress"), submitted: c("submitted"), approved: c("approved"), returned: c("returned"),
    overdue: k.due < 0 ? k.st.filter((v) => v !== "approved").length : 0, my_status: view === "assigned" ? "assigned" : null, total: TASKS.length };
};
function dossier(scope: string | null) {
  const eff = scope ?? TOP;
  if (scope && !inTop(scope)) return null;
  const n = eff ? find(eff) : undefined;
  if (eff && !n) return null;
  const rootKids = TREE.flatMap((pv) => pv.kids ?? []);
  const kids = n ? n.kids ?? [] : rootKids;
  const isTop = eff === TOP;
  const all = n ? descendants(n) : ALL.map((x) => x.n).filter((x) => x.level !== "province");
  const levels: Record<string, { total: number; with_leader: number; with_account: number; signed_in: number }> = {};
  for (const l of LEVELS_ORDER) {
    const xs = all.filter((x) => x.level === l);
    if (xs.length) levels[l] = { total: xs.length, with_leader: xs.filter((x) => x.leader).length, with_account: xs.filter((x) => x.leader && x.leader.status !== "record").length, signed_in: xs.filter((x) => x.leader?.status === "active").length };
  }
  const childLevel = n ? BELOW[n.level] : "district";
  const unit = n ?? { scope: "RW", level: "country", name: "U Rwanda", leader: undefined };
  const inScope = (sc: string) => !eff || sc === eff || sc.startsWith(eff + "-");
  const cs = CASES.filter((c) => inScope(c.scope));
  const case_counts: Record<string, number> = {};
  for (const c of cs) case_counts[c.status] = (case_counts[c.status] ?? 0) + 1;
  return {
    unit: { unit_id: "demo-" + unit.scope, scope_code: unit.scope, level: unit.level, name_kiny: unit.name, name_eng: unit.name, child_level: childLevel, is_my_top: isTop, card_expected: unit.level !== "province" && unit.level !== "country" },
    ancestors: eff ? ancestorsOf(eff).filter((a) => inTop(a.scope_code) && a.scope_code !== TOP) : [],
    leader: n?.leader ? { display_name: n.leader.name, job_title: n.leader.title, phone: n.leader.phone, public_email: null, office_hours: "Kuwa mbere – kuwa gatanu, 08:00–17:00", bio: "Ndi hano kugufasha.", photo_path: null, is_public: true, has_account: n.leader.status !== "record", status: n.leader.status, login_name: n.leader.status !== "record" ? "urugero." + n.scope.toLowerCase() : null, user_id: n.leader.status !== "record" ? "u-" + n.scope : null, updated_at: new Date().toISOString() } : null,
    levels,
    children: kids.map((k) => { const d = descendants(k); const sub: Record<string, number> = {}; for (const l of LEVELS_ORDER) { const c = d.filter((x) => x.level === l).length; if (c) sub[l] = c; }
      return { unit_id: "demo-" + k.scope, scope_code: k.scope, level: k.level, name: k.name, sub, cards_inside: d.filter((x) => x.leader).length, open_cases: CASES.filter((c) => c.status !== "resolved" && (c.scope === k.scope || c.scope.startsWith(k.scope + "-"))).length,
        leader_name: k.leader?.name ?? null, leader_title: k.leader?.title ?? null, leader_phone: k.leader?.phone ?? null, leader_photo: null, status: k.leader?.status ?? "vacant", card_expected: k.level !== "province" }; }),
    case_counts,
    cases: cs.slice(0, 5).map((c) => { const x = find(c.scope)!; return { id: c.id, category: c.category, message: c.message, status: c.status, created_at: new Date(Date.now() - c.ago * 86400000).toISOString(), scope_code: c.scope, unit_name: x.name, level: x.level }; }),
    recent: [
      { at: new Date().toISOString(), action: "update", scope_code: "RW-P1-D1-S1", unit_name: "Kimironko", level: "sector", who: "Mukamana Alice", leader_name: "Uwase Jeanne" },
      { at: new Date(Date.now() - 86400000).toISOString(), action: "insert", scope_code: "RW-P1-D1-S1-C1-V3", unit_name: "Izuba", level: "village", who: "Uwase Jeanne", leader_name: "Kamanzi Claire" },
    ].filter((r) => inScope(r.scope_code)),
    attention: { vacant_units: all.filter((x) => x.level === childLevel && !x.leader).length, vacant_level: childLevel, waiting_login_over_7d: all.filter((x) => x.leader?.status === "invited").length, cards_without_phone: 1, open_cases: cs.filter((c) => c.status !== "resolved").length },
    tasks: { open_targets: 4, overdue_targets: 1, waiting_review: 1 },
    messages: isTop ? { sent_30d: 6, delivered_30d: 18, read_30d: 13 } : null,
    as_of: new Date().toISOString(),
  };
}

// Which tier the demo shows: ?tier=country (default) | district | sector | cell. The instance is scoped to one invented place.
const TIER_TOP: Record<string, string | null> = { country: null, district: "RW-P1-D1", sector: "RW-P1-D1-S1", cell: "RW-P1-D1-S1-C1" };
let TOP: string | null = null;
const inTop = (sc: string) => !TOP || sc === TOP || sc.startsWith(TOP + "-");
const VERIFIED = new Set<string>(["RW-P1-D1-S1-C1-V1"]);
type DemoRecord = { id: string; title: string; kind: string; note: string | null; file_name: string | null; size_bytes: number | null; scope: string; ago: number; by: string };
const RECORDS: DemoRecord[] = [
  { id: "r1", title: "Inyandikomvugo y'inama y'umutekano", kind: "minutes", note: "Inama yo ku wa gatatu yarebye iby'umutekano mu mirenge.", file_name: "inama-umutekano.pdf", size_bytes: 482000, scope: "RW-P1-D1", ago: 2, by: "Mukamana Alice" },
  { id: "r2", title: "Icyemezo cy'isuku mu mudugudu", kind: "decision", note: null, file_name: null, size_bytes: null, scope: "RW-P1-D1-S1", ago: 6, by: "Uwase Jeanne" },
  { id: "r3", title: "Raporo y'ukwezi k'Ukwakira", kind: "report", note: "Raporo y'ibyakozwe n'ibigikenewe.", file_name: "raporo-ukwakira.pdf", size_bytes: 1250000, scope: "RW-P1-D1-S1-C1", ago: 9, by: "Habimana Eric" },
];

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function demoFetch(url: string, init?: RequestInit): Response | null {
  const u = new URL(url, window.location.origin);
  const p = u.pathname;
  const method = (init?.method ?? "GET").toUpperCase();
  if (p === "/api/admin/leader-registry/logout") return reply({ status: "success" });
  if (!p.startsWith("/api/admin/office/")) return null;
  if (p === "/api/admin/office/me") {
    const tn = TOP ? find(TOP)! : null;
    const role = !tn ? "national_super_admin" : tn.level + "_admin";
    const below = tn ? BELOW[tn.level] : "district";
    return reply({
      status: "success", user: { id: "demo", email: null },
      profile: { display_name: tn?.leader?.name ?? "Umuyobozi w'Urugero", job_title: tn?.leader?.title ?? "URUGERO · amakuru y'ibihimbano", login_name: "urugero", must_change_password: false },
      assignments: [{ role_code: role, unit: { id: "demo-" + (TOP ?? "RW"), scope_code: TOP ?? "RW", name_kiny: tn?.name ?? "U Rwanda", name_eng: tn?.name ?? "Rwanda", level: tn?.level ?? "country" }, child_level: below }],
    });
  }
  if (p === "/api/admin/office/workspace") {
    const tn = TOP ? find(TOP)! : null;
    const d = dossier(null)!;
    const counts: Record<string, number> = {};
    for (const l of LEVELS_ORDER) if (d.levels[l]) counts[l] = d.levels[l].total;
    if (!tn) Object.assign(counts, { district: 30, sector: 416, cell: 2148, village: 14837 });
    return reply({ status: "success", workspace: {
      scope: { unit_id: "demo-" + (TOP ?? "RW"), scope_code: TOP ?? "RW", level: tn?.level ?? "country", name_kiny: tn?.name ?? "U Rwanda", name_eng: tn?.name ?? "Rwanda", role_code: tn ? tn.level + "_admin" : "national_super_admin" },
      child_level: tn ? BELOW[tn.level] : "district", counts,
      child_total: d.children.length, child_with_leader: d.children.filter((c) => c.status !== "vacant").length, child_with_account: d.children.filter((c) => c.status === "active" || c.status === "invited").length,
      accounts_below: 21, accounts_waiting_first_login: 4, unread: 2 } });
  }
  if (p === "/api/admin/office/units") {
    const parent = u.searchParams.get("parent");
    const kids = parent ? find(parent)?.kids ?? [] : TOP ? find(TOP)?.kids ?? [] : TREE;
    return reply({ status: "success", units: kids.map(unitRow) });
  }
  if (p === "/api/admin/office/leaders" && method === "GET") {
    const q = (u.searchParams.get("q") ?? "").toLowerCase();
    const level = u.searchParams.get("level");
    const rows = ALL.filter((x) => x.n.leader && (!level || x.n.level === level) && (!q || x.n.leader.name.toLowerCase().includes(q) || x.n.name.toLowerCase().includes(q)))
      .map((x) => ({ unit_id: "demo-" + x.n.scope, scope_code: x.n.scope, level: x.n.level, unit_name: x.n.name, parent_name: x.parent,
        leader_user_id: null, leader_name: x.n.leader!.name, leader_title: x.n.leader!.title, leader_phone: x.n.leader!.phone, leader_photo: null, leader_public: true, status: x.n.leader!.status }));
    return reply({ status: "success", leaders: rows });
  }
  const m = p.match(/^\/api\/admin\/office\/leaders\/demo-([^/]+)(\/photo)?$/);
  if (m) {
    if (m[2]) return reply({ status: "success", photo_path: "office/demo/demo.webp" }, 201);
    if (method !== "GET") return reply({ status: "success" });
    const n = find(m[1]);
    return reply({ status: "success", card: {
      unit_id: "demo-" + m[1], scope_code: m[1], level: n?.level ?? "district", unit_name: n?.name ?? "", user_id: null,
      display_name: n?.leader?.name ?? null, job_title: n?.leader?.title ?? null, phone: n?.leader?.phone ?? null, public_email: null,
      bio: n?.leader ? "Ndi hano kugufasha mu byo ukeneye byose by'umurenge." : null, office_hours: n?.leader ? "Kuwa mbere – kuwa gatanu, 08:00–17:00" : null,
      photo_path: null, is_public: true, show_phone: true, can_edit: n?.level !== "province" } });
  }
  if (p === "/api/admin/office/messages") {
    if (method !== "GET") return reply({ status: "success", delivered_to: 3 });
    if (u.searchParams.get("box") === "sent") return reply({ status: "success", messages: [
      { message_id: "s1", subject: "Inama y'ejo", body: "Turahurira ejo saa tatu mu biro by'akarere.", created_at: new Date().toISOString(), audience: "below", recipients: 3, read_count: 2 },
      { message_id: "s2", subject: "Raporo y'ukwezi", body: "Mwandikire raporo y'ukwezi mbere y'itariki 30.", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), audience: "below", recipients: 3, read_count: 3 } ] });
    return reply({ status: "success", messages: [
      { message_id: "m1", subject: "Ubukangurambaga bw'isuku", body: "Muzitegure ubukangurambaga bw'isuku kuwa gatandatu.", created_at: new Date().toISOString(), read_at: null, sender_id: "x", sender_name: "Mukamana Alice", sender_title: "Umuyobozi w'Akarere" },
      { message_id: "m2", subject: "Ibarura ry'abaturage", body: "Ibarura rirakomeza mu mirenge yose.", created_at: new Date(Date.now() - 86400000).toISOString(), read_at: null, sender_id: "y", sender_name: "Uwase Jeanne", sender_title: "Umunyamabanga Nshingwabikorwa" },
      { message_id: "m3", subject: "Murakoze", body: "Murakoze ku mukoro mwakoze.", created_at: new Date(Date.now() - 86400000 * 4).toISOString(), read_at: new Date().toISOString(), sender_id: "z", sender_name: "Niyonsenga Grace", sender_title: "Umuyobozi w'Akarere" } ] });
  }
  if (p === "/api/admin/office/accounts") {
    if (method !== "GET") return reply({ status: "success", account: { user_id: "n", login_name: "urugero.123", temp_password: "Ab3dEf7hJk", display_name: "Umuyobozi mushya", role_code: "district_admin", unit_name: "Urugero" } }, 201);
    const c = (id: string, name: string, level: string, unit: string, rel: string, wait: boolean) => ({ user_id: id, display_name: name, job_title: null, phone: "+250 788 000 00" + id.slice(-1), login_name: null, role_code: "x", unit_id: id, unit_name: unit, unit_level: level, relation: rel, created_by_me: true, must_change_password: wait });
    return reply({ status: "success", contacts: [c("a1", "Mukamana Alice", "district", "Gasabo", "below", false), c("a2", "Niyonsenga Grace", "district", "Kicukiro", "below", false), c("a3", "Twagirayezu Jean", "district", "Nyarugenge", "below", true), c("a4", "Uwase Jeanne", "sector", "Kimironko", "below", false)] });
  }
  if (p === "/api/admin/office/verification/unit") {
    const sc = u.searchParams.get("scope") ?? "";
    const n = find(sc);
    return reply({ status: "success", verification: { has_card: !!n?.leader, verified_at: VERIFIED.has(sc) ? new Date(Date.now() - 86400000).toISOString() : null, verified_by_name: VERIFIED.has(sc) ? "Mukamana Alice" : null, can_verify: !!n?.leader && sc !== TOP } });
  }
  if (p === "/api/admin/office/verification") {
    if (method === "POST") { const body = JSON.parse(String(init?.body ?? "{}")); const sc = String(body.unit_id ?? "").replace("demo-", ""); if (body.verified) VERIFIED.add(sc); else VERIFIED.delete(sc); return reply({ status: "success" }); }
    const st = u.searchParams.get("state") ?? "pending"; const lv = u.searchParams.get("level"); const under = u.searchParams.get("under");
    const rows = ALL.filter((x) => x.n.leader && inTop(x.n.scope) && x.n.scope !== TOP && (!lv || x.n.level === lv) && (!under || x.n.scope.startsWith(under + "-")) && (st === "all" || (st === "verified") === VERIFIED.has(x.n.scope)))
      .map((x) => ({ unit_id: "demo-" + x.n.scope, scope_code: x.n.scope, level: x.n.level, unit_name: x.n.name, parent_name: x.parent, leader_name: x.n.leader!.name, leader_title: x.n.leader!.title, leader_phone: x.n.leader!.phone, leader_photo: null,
        status: x.n.leader!.status, verified_at: VERIFIED.has(x.n.scope) ? new Date(Date.now() - 86400000).toISOString() : null, verified_by_name: VERIFIED.has(x.n.scope) ? "Mukamana Alice" : null, updated_at: new Date().toISOString() }));
    return reply({ status: "success", total: rows.length, items: rows });
  }
  if (p === "/api/admin/office/report") {
    const sc = u.searchParams.get("scope") ?? TOP;
    const parent = sc ? find(sc) : undefined;
    const kids = parent ? parent.kids ?? [] : TREE.flatMap((pv) => pv.kids ?? []);
    return reply({ status: "success", as_of: new Date().toISOString(), rows: kids.map((k) => {
      const d = descendants(k); const cards = d.filter((x) => x.leader);
      return { unit_id: "demo-" + k.scope, scope_code: k.scope, level: k.level, name: k.name, leader_name: k.leader?.name ?? null, leader_status: k.leader?.status ?? "vacant",
        units_below: d.length, cards: cards.length, accounts: cards.filter((x) => x.leader!.status !== "record").length, signed_in: cards.filter((x) => x.leader!.status === "active").length,
        verified: cards.filter((x) => VERIFIED.has(x.scope)).length, open_cases: CASES.filter((c) => c.status !== "resolved" && (c.scope === k.scope || c.scope.startsWith(k.scope + "-"))).length,
        overdue_tasks: k.leader?.status === "invited" ? 1 : 0, records: RECORDS.filter((r) => r.scope === k.scope || r.scope.startsWith(k.scope + "-")).length };
    }) });
  }
  const rf = p.match(/^\/api\/admin\/office\/records\/([^/]+)(\/file)?$/);
  if (rf) return rf[2] ? reply({ status: "success", url: "about:blank" }) : reply({ status: "success" });
  if (p === "/api/admin/office/records") {
    if (method === "POST") return reply({ status: "success", id: "rnew" }, 201);
    const kd = u.searchParams.get("kind"); const q = (u.searchParams.get("q") ?? "").toLowerCase(); const under = u.searchParams.get("under");
    const rows = RECORDS.filter((r) => inTop(r.scope) && (!kd || r.kind === kd) && (!q || r.title.toLowerCase().includes(q)) && (!under || r.scope === under || r.scope.startsWith(under + "-")))
      .map((r) => { const n = find(r.scope)!; return { id: r.id, title: r.title, kind: r.kind, note: r.note, file_name: r.file_name, size_bytes: r.size_bytes, has_file: !!r.file_name, created_at: new Date(Date.now() - r.ago * 86400000).toISOString(), created_by_name: r.by,
        unit_id: "demo-" + r.scope, scope_code: r.scope, level: n.level, unit_name: n.name, can_archive: true }; });
    return reply({ status: "success", total: rows.length, records: rows });
  }
  if (p === "/api/admin/office/unit") {
    const d = dossier(u.searchParams.get("scope"));
    return d ? reply({ status: "success", dossier: d }) : reply({ status: "error", message_kiny: "Ahantu ntiharaboneka." }, 404);
  }
  if (p === "/api/admin/office/search") {
    const q = (u.searchParams.get("q") ?? "").toLowerCase(); const level = u.searchParams.get("level"); const under = u.searchParams.get("under"); const vac = u.searchParams.get("vacant");
    const rows = ALL.filter((x) => x.n.level !== "province" && (!level || x.n.level === level) && inTop(x.n.scope) && x.n.scope !== TOP && (!under || x.n.scope.startsWith(under + "-")) && (!q || x.n.name.toLowerCase().includes(q) || (x.n.leader?.name.toLowerCase().includes(q) ?? false)) && (vac !== "1" || !x.n.leader) && (vac !== "0" || !!x.n.leader));
    return reply({ status: "success", total: rows.length, units: rows.map((x) => ({ unit_id: "demo-" + x.n.scope, scope_code: x.n.scope, level: x.n.level, name: x.n.name, parent_name: x.parent, leader_name: x.n.leader?.name ?? null, leader_title: x.n.leader?.title ?? null, leader_phone: x.n.leader?.phone ?? null, leader_photo: null, status: x.n.leader?.status ?? "vacant", total: rows.length })) });
  }
  if (p === "/api/admin/office/people") {
    const st = u.searchParams.get("status"); const under = u.searchParams.get("under");
    const rows = ALL.filter((x) => x.n.leader && x.n.leader.status !== "record" && inTop(x.n.scope) && x.n.scope !== TOP && (!under || x.n.scope.startsWith(under + "-")) && (!st || x.n.leader.status === st))
      .map((x) => ({ user_id: "u-" + x.n.scope, display_name: x.n.leader!.name, job_title: x.n.leader!.title, phone: x.n.leader!.phone, login_name: "urugero." + x.n.scope.toLowerCase(), role_code: x.n.level + "_admin", unit_id: "demo-" + x.n.scope, scope_code: x.n.scope, unit_level: x.n.level, unit_name: x.n.name, parent_name: x.parent, status: x.n.leader!.status, created_at: new Date(Date.now() - 5 * 86400000).toISOString() }));
    return reply({ status: "success", total: rows.length, accounts: rows });
  }
  if (p.startsWith("/api/admin/office/people/")) return reply({ status: "success", temp_password: "Ab3dEf7hJk" });
  if (p === "/api/admin/office/cases") {
    if (method === "PATCH") { const body = JSON.parse(String(init?.body ?? "{}")); const c = CASES.find((x) => x.id === body.id); if (c) c.status = body.status; return reply({ status: "success" }); }
    const rows = caseRows(u.searchParams.get("scope"), u.searchParams.get("status"));
    return reply({ status: "success", total: rows.length, cases: rows });
  }
  if (p === "/api/admin/office/tasks") {
    if (method === "POST") return reply({ status: "success", task_id: "t1" }, 201);
    return reply({ status: "success", total: TASKS.length, tasks: TASKS.map((k) => taskRow(k, u.searchParams.get("view") ?? "issued")) });
  }
  const tm = p.match(/^\/api\/admin\/office\/tasks\/([^/]+)$/);
  if (tm) {
    if (method !== "GET") return reply({ status: "success" });
    const k = TASKS.find((x) => x.id === tm[1]) ?? TASKS[0];
    return reply({ status: "success", detail: {
      task: { id: k.id, reference: k.reference, title: k.title, body: k.body, priority: k.priority, due_at: new Date(Date.now() + k.due * 86400000).toISOString(), status: "open", created_at: new Date().toISOString(), issuer_name: "Umuyobozi w'Urugero", issuer_unit: "U Rwanda", can_cancel: true },
      targets: k.targets.map((sc, i) => { const n = find(sc)!; const st = k.st[i]; return { unit_id: "demo-" + sc, scope_code: sc, level: n.level, name: n.name, parent_name: "Umujyi wa Kigali", leader_name: n.leader?.name ?? null, status: st,
        note: st === "submitted" ? "Raporo yoherejwe, mwayisuzume." : null, review_note: null, submitted_at: st === "submitted" ? new Date().toISOString() : null, overdue: k.due < 0 && st !== "approved", can_review: st === "submitted", can_update: false }; }) } });
  }
  if (p === "/api/admin/office/audit") {
    const ev = [
      { at: new Date().toISOString(), kind: "card_update", who: "Mukamana Alice", unit_name: "Kimironko", level: "sector", scope_code: "RW-P1-D1-S1", detail: "Uwase Jeanne" },
      { at: new Date(Date.now() - 3600000 * 5).toISOString(), kind: "task_issued", who: "Umuyobozi w'Urugero", unit_name: "U Rwanda", level: "country", scope_code: "RW-P1", detail: "IM-2026-0001 · Raporo y'isuku" },
      { at: new Date(Date.now() - 86400000).toISOString(), kind: "account_created", who: "Umuyobozi w'Urugero", unit_name: "Nyarugenge", level: "district", scope_code: "RW-P1-D3", detail: "Twagirayezu Jean" },
    ];
    return reply({ status: "success", total: ev.length, events: ev });
  }
  return reply({ status: "error", message_kiny: "Urugero: iki gice nticyerekanwa." }, 404);
}

export default function DemoEntry() {
  const router = useRouter();
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const fake = demoFetch(url, init);
      return fake ? Promise.resolve(fake) : original(input, init);
    }) as typeof window.fetch;
    const bar = document.createElement("div");
    bar.textContent = "URUGERO · amakuru y'ibihimbano, nta kintu kibikwa";
    bar.setAttribute("style", "position:fixed;top:0;left:0;right:0;z-index:99999;background:#FAD201;color:#06231A;font:700 12px sans-serif;text-align:center;padding:4px");
    document.body.appendChild(bar);
    const tier = new URLSearchParams(window.location.search).get("tier") ?? "country";
    TOP = tier in TIER_TOP ? TIER_TOP[tier] : null;
    bar.textContent = "URUGERO (" + (tier in TIER_TOP ? tier : "country") + ") · amakuru y'ibihimbano, nta kintu kibikwa";
    router.replace("/admin/ibiro");
  }, [router]);
  return <main className="p-8 text-center">…</main>;
}
