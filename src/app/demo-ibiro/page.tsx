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

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function demoFetch(url: string, init?: RequestInit): Response | null {
  const u = new URL(url, window.location.origin);
  const p = u.pathname;
  const method = (init?.method ?? "GET").toUpperCase();
  if (p === "/api/admin/leader-registry/logout") return reply({ status: "success" });
  if (!p.startsWith("/api/admin/office/")) return null;
  if (p === "/api/admin/office/me") return reply({
    status: "success", user: { id: "demo", email: null },
    profile: { display_name: "Umuyobozi w'Urugero", job_title: "URUGERO · amakuru y'ibihimbano", login_name: "urugero", must_change_password: false },
    assignments: [{ role_code: "national_super_admin", unit: { id: "demo-RW", scope_code: "RW", name_kiny: "U Rwanda", name_eng: "Rwanda", level: "country" }, child_level: "district" }],
  });
  if (p === "/api/admin/office/workspace") return reply({ status: "success", workspace: {
    scope: { unit_id: "demo-RW", scope_code: "RW", level: "country", name_kiny: "U Rwanda", name_eng: "Rwanda", role_code: "national_super_admin" },
    child_level: "district", counts: { district: 30, sector: 416, cell: 2148, village: 14837 },
    child_total: 30, child_with_leader: 12, child_with_account: 9, accounts_below: 21, accounts_waiting_first_login: 4, unread: 2 } });
  if (p === "/api/admin/office/units") {
    const parent = u.searchParams.get("parent");
    const kids = parent ? find(parent)?.kids ?? [] : TREE;
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
    router.replace("/admin/ibiro");
  }, [router]);
  return <main className="p-8 text-center">…</main>;
}
