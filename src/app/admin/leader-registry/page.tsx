"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegistryDetails } from "./RegistryDetails";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  FileText,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

type UnitLevel = "country" | "province" | "district" | "sector" | "cell" | "village";
type Unit = {
  id: string;
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: UnitLevel;
  parent_id?: string | null;
};
type Assignment = {
  id: string;
  role_code: string;
  administrative_unit_id: string;
  valid_from: string;
  valid_until: string | null;
  boundary: Unit | null;
};
type Position = {
  id: string;
  code: string;
  title_kiny: string;
  title_eng: string;
  title_fra: string;
  required_boundary_level: Exclude<UnitLevel, "province">;
  is_exclusive: boolean;
  position_status: "draft" | "approved" | "retired";
  approved_at?: string | null;
};
type Appointment = {
  id: string;
  person_id: string;
  position_id: string;
  administrative_unit_id: string;
  effective_from: string;
  effective_to: string | null;
  appointment_status: string;
  version: number;
  created_at: string;
  person: { id: string; first_name: string; last_name: string; version: number } | null;
  position: { id: string; code: string; title_kiny: string; title_eng: string; title_fra: string; required_boundary_level: string } | null;
  boundary: Unit | null;
};
type VerificationCase = {
  id: string;
  appointment_id: string;
  verification_status: string;
  submitted_by: string;
  decision_by: string | null;
  decision_at: string | null;
  decision_reason: string | null;
  version: number;
};
type AuditEvent = {
  id: string;
  actor_role: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  changed_fields: string[];
  reason: string | null;
  created_at: string;
};

type ActiveTab = "appointments" | "positions" | "audit";

const rank: Record<UnitLevel, number> = {
  country: 0,
  province: 1,
  district: 2,
  sector: 3,
  cell: 4,
  village: 5,
};

function nextLevel(level: UnitLevel): Exclude<UnitLevel, "country"> | null {
  if (level === "country") return "province";
  if (level === "province") return "district";
  if (level === "district") return "sector";
  if (level === "sector") return "cell";
  if (level === "cell") return "village";
  return null;
}

const levelName: Record<UnitLevel, string> = {
  country: "Igihugu",
  province: "Intara (ahantu gusa)",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
};

const statusName: Record<string, string> = {
  draft: "Inyandiko itegurwa",
  pending: "Itegereje gusuzumwa",
  under_review: "Irimo gusuzumwa",
  approved: "Byemejwe",
  active: "Ari mu nshingano",
  rejected: "Byanzwe",
  suspended: "Byahagaritswe",
  disputed: "Biri impaka",
  ended: "Byarangiye",
  archived: "Byabitswe mu mateka",
};

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message_kiny" in payload) {
    const message = (payload as { message_kiny?: unknown }).message_kiny;
    if (typeof message === "string" && message.length) return message;
  }
  return fallback;
}

export default function LeaderRegistryPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<ActiveTab>("appointments");
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);

  // New appointment form
  const [showCreate, setShowCreate] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [unitPath, setUnitPath] = useState<Unit[]>([]);
  const [unitOptions, setUnitOptions] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [evidenceType, setEvidenceType] = useState("appointment_letter");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  // Official positions catalogue (National Super Admin only)
  const [positionCode, setPositionCode] = useState("");
  const [titleKiny, setTitleKiny] = useState("");
  const [titleEng, setTitleEng] = useState("");
  const [titleFra, setTitleFra] = useState("");
  const [positionLevel, setPositionLevel] = useState<Position["required_boundary_level"]>("village");
  const [positionExclusive, setPositionExclusive] = useState(true);
  const [positionBusy, setPositionBusy] = useState(false);

  // Review reasons are kept per case so reviewers can document their decision.
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);

  const activeAssignment = useMemo(
    () => assignments.find((item) => item.id === assignmentId) ?? assignments[0] ?? null,
    [assignments, assignmentId]
  );
  const isNational = assignments.some((item) => item.role_code === "national_super_admin");
  const selectedPosition = positions.find((item) => item.id === positionId) ?? null;
  const selectedUnit = unitPath[unitPath.length - 1] ?? null;
  const targetLevel = selectedPosition?.required_boundary_level ?? null;
  const unitReady = Boolean(selectedUnit && targetLevel && selectedUnit.level === targetLevel);
  const rootTooDeep = Boolean(activeAssignment?.boundary && targetLevel &&
    rank[activeAssignment.boundary.level] > rank[targetLevel]);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true);
    else setRefreshing(true);
    setError(null);
    try {
      const sessionResponse = await fetch("/api/admin/leader-registry/session", { cache: "no-store" });
      const sessionPayload = await sessionResponse.json().catch(() => null);
      if (sessionResponse.status === 403 && sessionPayload?.code === "MFA_REQUIRED") {
        router.replace("/admin/mfa");
        return;
      }
      if (sessionResponse.status === 401 || sessionResponse.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!sessionResponse.ok || sessionPayload?.status !== "success") {
        throw new Error(errorMessage(sessionPayload, "Konti y'ubuyobozi ntiyagenzuwe."));
      }

      setUser(sessionPayload.user ?? null);
      const nextAssignments = (sessionPayload.assignments ?? []) as Assignment[];
      setAssignments(nextAssignments);
      setAssignmentId((current) =>
        nextAssignments.some((item) => item.id === current) ? current : (nextAssignments[0]?.id ?? "")
      );

      const [positionResponse, appointmentResponse, caseResponse, auditResponse] = await Promise.all([
        fetch("/api/admin/leader-registry/positions", { cache: "no-store" }),
        fetch("/api/admin/leader-registry/appointments", { cache: "no-store" }),
        fetch("/api/admin/leader-registry/verification", { cache: "no-store" }),
        fetch("/api/admin/leader-registry/audit?limit=50", { cache: "no-store" }),
      ]);
      const [positionPayload, appointmentPayload, casePayload, auditPayload] = await Promise.all([
        positionResponse.json().catch(() => null),
        appointmentResponse.json().catch(() => null),
        caseResponse.json().catch(() => null),
        auditResponse.json().catch(() => null),
      ]);

      if (!positionResponse.ok) throw new Error(errorMessage(positionPayload, "Urutonde rw'imyanya ntirubonetse."));
      if (!appointmentResponse.ok) throw new Error(errorMessage(appointmentPayload, "Abayobozi ntibabonetse."));
      if (!caseResponse.ok) throw new Error(errorMessage(casePayload, "Imanza zo kugenzura ntizabonetse."));
      if (!auditResponse.ok && auditResponse.status !== 403) throw new Error(errorMessage(auditPayload, "Audit log ntiyabonetse."));

      setPositions((positionPayload?.positions ?? []) as Position[]);
      setAppointments((appointmentPayload?.appointments ?? []) as Appointment[]);
      setCases((casePayload?.cases ?? []) as VerificationCase[]);
      setAudit((auditPayload?.events ?? []) as AuditEvent[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Habaye ikibazo kitazwi.");
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const root = activeAssignment?.boundary;
    if (root) setUnitPath([root]);
    else setUnitPath([]);
    setUnitOptions([]);
  }, [activeAssignment?.id, activeAssignment?.boundary?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadNextUnits() {
      const parent = unitPath[unitPath.length - 1];
      if (!parent || !targetLevel || parent.level === targetLevel || rootTooDeep) {
        setUnitOptions([]);
        return;
      }
      const childLevel = nextLevel(parent.level);
      if (!childLevel || rank[childLevel] > rank[targetLevel]) {
        setUnitOptions([]);
        return;
      }

      setUnitsLoading(true);
      try {
        const params = new URLSearchParams({ level: childLevel, parent_id: parent.id });
        const response = await fetch("/api/administrative-units?" + params.toString(), { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.status !== "success") {
          throw new Error(errorMessage(payload, "Ntibyashobotse kubona inzego zikurikira."));
        }
        if (!cancelled) setUnitOptions((payload.units ?? []) as Unit[]);
      } catch (cause) {
        if (!cancelled) setUnitOptions([]);
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubona inzego zikurikira.");
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    }
    void loadNextUnits();
    return () => { cancelled = true; };
  }, [unitPath, targetLevel, rootTooDeep]);

  function selectChildUnit(unitId: string) {
    const child = unitOptions.find((item) => item.id === unitId);
    if (!child) return;
    setUnitPath((previous) => [...previous, child]);
    setUnitOptions([]);
  }

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPosition || !selectedUnit || !unitReady) {
      setError("Hitamo umwanya n'agace bihuye mbere yo kohereza.");
      return;
    }
    setCreateBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/leader-registry/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          position_id: positionId,
          administrative_unit_id: selectedUnit.id,
          effective_from: effectiveFrom,
          evidence_type: evidenceType,
          reference_number: referenceNumber,
          issuer,
          issued_on: issuedOn || null,
          valid_until: null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(errorMessage(payload, "Kohereza appointment n'icyemezo byanze."));
      }

      setNotice("Umwirondoro, appointment n'icyemezo byabitswe hamwe. Bitegereje kugenzurwa n'urwego rubifitiye ububasha.");
      setFirstName("");
      setLastName("");
      setReferenceNumber("");
      setIssuer("");
      setIssuedOn("");
      setShowCreate(false);
      await loadData(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kohereza amakuru.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function decideCase(item: VerificationCase, decision: "under_review" | "approved" | "rejected") {
    const reason = reviewReasons[item.id]?.trim() ?? "";
    if (decision !== "under_review" && reason.length < 4) {
      setError("Andika impamvu y'icyemezo (amagambo nibura 4).");
      return;
    }
    setDecisionBusyId(item.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/leader-registry/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          version: item.version,
          verification_status: decision,
          decision_reason: decision === "under_review" ? undefined : reason,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(errorMessage(payload, "Icyemezo nticyabitswe."));
      }
      setNotice(decision === "approved" ? "Umuyobozi yemejwe." : decision === "rejected" ? "Icyifuzo cyanzwe." : "Isuzuma ryatangiye.");
      setReviewReasons((current) => ({ ...current, [item.id]: "" }));
      await loadData(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubika icyemezo.");
    } finally {
      setDecisionBusyId(null);
    }
  }

  async function createPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPositionBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/leader-registry/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: positionCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          title_kiny: titleKiny,
          title_eng: titleEng,
          title_fra: titleFra,
          required_boundary_level: positionLevel,
          is_exclusive: positionExclusive,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(errorMessage(payload, "Umwanya ntiwabitswe."));
      }
      setNotice("Umwanya mushya wabitswe nka Draft. Ugomba kwemezwa mbere yo gukoreshwa.");
      setPositionCode("");
      setTitleKiny("");
      setTitleEng("");
      setTitleFra("");
      await loadData(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubika umwanya.");
    } finally {
      setPositionBusy(false);
    }
  }

  async function approvePosition(position: Position) {
    setPositionBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/leader-registry/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: position.id, position_status: "approved" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(errorMessage(payload, "Kwemeza umwanya byanze."));
      }
      setNotice("Umwanya wemejwe kandi ushobora gukoreshwa mu gushyiraho abayobozi.");
      await loadData(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kwemeza umwanya.");
    } finally {
      setPositionBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/leader-registry/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  const casesByAppointment = useMemo(() => {
    const map = new Map<string, VerificationCase>();
    for (const item of cases) map.set(item.appointment_id, item);
    return map;
  }, [cases]);

  const filteredAppointments = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return appointments;
    return appointments.filter((item) => {
      const name = item.person ? item.person.first_name + " " + item.person.last_name : "";
      return name.toLowerCase().includes(value) ||
        (item.position?.title_kiny ?? "").toLowerCase().includes(value) ||
        (item.boundary?.name_kiny ?? "").toLowerCase().includes(value);
    });
  }, [appointments, search]);

  const pendingCount = cases.filter((item) => ["pending", "under_review"].includes(item.verification_status)).length;
  const verifiedCount = cases.filter((item) => item.verification_status === "approved").length;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="h-1 bg-gradient-to-r from-[#00A3E0] via-[#FAD201] to-[#20603D]" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-[#00A3E0]" />
            <div>
              <h1 className="text-base font-black text-foreground">IWACU RWANDA · LEADER REGISTRY</h1>
              <p className="text-xs text-muted-foreground">{user?.email ?? "Konti y'ubuyobozi"} · {activeAssignment?.boundary?.name_kiny ?? "Urwego rutagenzuwe"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex min-h-[40px] items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Urubuga rusange</Link>
            <button type="button" onClick={logout} className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Sohoka
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:py-7">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Funga" className="text-xs">×</button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Appointments zose</p>
            <p className="mt-1 text-2xl font-black">{appointments.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Itegereje isuzuma</p>
            <p className="mt-1 text-2xl font-black text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Byemejwe</p>
            <p className="mt-1 text-2xl font-black text-[#20603D]">{verifiedCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Uburyo bwo kuyobora</p>
            <p className="mt-1 text-sm font-bold text-[#00A3E0]">{assignments.length ? "Buragenzuwe" : "Nta bubasha"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-1" aria-label="Registry modules">
              <button onClick={() => setTab("appointments")} className={`min-h-[40px] rounded-xl px-3 text-xs font-bold ${tab === "appointments" ? "bg-[#00A3E0] text-white" : "text-muted-foreground hover:bg-muted"}`}>
                <Users className="mr-1 inline h-4 w-4" /> Abayobozi
              </button>
              {isNational && (
                <button onClick={() => setTab("positions")} className={`min-h-[40px] rounded-xl px-3 text-xs font-bold ${tab === "positions" ? "bg-[#00A3E0] text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  Imyanya yemewe
                </button>
              )}
              <button onClick={() => setTab("audit")} className={`min-h-[40px] rounded-xl px-3 text-xs font-bold ${tab === "audit" ? "bg-[#00A3E0] text-white" : "text-muted-foreground hover:bg-muted"}`}>
                Amateka y'ibikorwa
              </button>
            </nav>
            <button type="button" onClick={() => loadData(true)} disabled={refreshing} className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Vugurura
            </button>
          </div>
        </section>

        {tab === "appointments" && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold">Abayobozi n'imyanya yabo</h2>
                <p className="text-xs text-muted-foreground">Buri muntu, appointment n'icyemezo cyo kumwemeza bigira records zitandukanye.</p>
              </div>
              <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white hover:bg-[#1b5234]">
                <Plus className="h-4 w-4" /> Andika umuyobozi
              </button>
            </div>

            {showCreate && (
              <form onSubmit={submitAppointment} className="space-y-4 rounded-2xl border border-[#00A3E0]/30 bg-card p-4 sm:p-5">
                <div>
                  <h3 className="font-bold">Umwirondoro n'ishyirwaho mu nshingano</h3>
                  <p className="text-xs text-muted-foreground">Kohereza bibika person, appointment, verification case n'ibimenyetso mu transaction imwe.</p>
                </div>

                {assignments.length > 1 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Konti / Agace ucunga</label>
                    <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm">
                      {assignments.map((item) => <option key={item.id} value={item.id}>{item.role_code} · {item.boundary?.name_kiny ?? item.boundary?.scope_code}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Amazina y'umuyobozi</label>
                    <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Izina" className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Izina ry'umuryango</label>
                    <input required value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Izina ry'umuryango" className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Umwanya (Position)</label>
                  <select required value={positionId} onChange={(event) => setPositionId(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">Hitamo umwanya wemejwe</option>
                    {positions.filter((item) => item.position_status === "approved").map((item) => (
                      <option key={item.id} value={item.id}>{item.title_kiny} · {levelName[item.required_boundary_level]}</option>
                    ))}
                  </select>
                  {positions.filter((item) => item.position_status === "approved").length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">Nta mwanya wemejwe urashyirwaho. Urwego rw'Igihugu rugomba kubanza kwemeza imyanya.</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold">Agace umuyobozi azakoramo</label>
                    {unitPath.length > 1 && (
                      <button type="button" onClick={() => setUnitPath((value) => value.slice(0, -1))} className="inline-flex items-center gap-1 text-xs font-semibold text-[#00A3E0]">
                        <ChevronLeft className="h-3.5 w-3.5" /> Subira inyuma
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {unitPath.map((unit) => <span key={unit.id} className="rounded-lg bg-background px-2 py-1">{levelName[unit.level]}: {unit.name_kiny}</span>)}
                  </div>
                  {!targetLevel && <p className="mt-2 text-xs text-muted-foreground">Banza uhitemo umwanya kugira ngo uhitemo urwego rw'ahantu rukwiye.</p>}
                  {rootTooDeep && <p className="mt-2 text-xs text-red-700">Umwanya wahisemo uri hejuru y'agace konti yawe icunga.</p>}
                  {targetLevel && !rootTooDeep && !unitReady && (
                    <div className="mt-3">
                      {unitsLoading ? (
                        <p className="text-xs text-muted-foreground">Turimo kuzana urutonde rw'ahantu...</p>
                      ) : unitOptions.length ? (
                        <select value="" onChange={(event) => selectChildUnit(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm">
                          <option value="">Hitamo {levelName[unitOptions[0].level]}</option>
                          {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name_kiny}</option>)}
                        </select>
                      ) : (
                        <p className="text-xs text-amber-700">Nta handi hantu habonetse munsi y'uru rwego. Ongera urebe agace cyangwa position.</p>
                      )}
                    </div>
                  )}
                  {unitReady && selectedUnit && (
                    <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#20603D]"><Check className="h-4 w-4" /> Agace karahuye n'urwego rw'umwanya.</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Itariki atangiriraho</label>
                    <input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Ubwoko bw'icyemezo</label>
                    <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="appointment_letter">Ibaruwa y'ishyirwaho</option>
                      <option value="official_gazette">Official Gazette</option>
                      <option value="ministerial_order">Iteka rya Minisiteri</option>
                      <option value="election_result">Ibyavuye mu matora</option>
                      <option value="other_official_record">Indi nyandiko yemewe</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Nimero y'inyandiko / Reference</label>
                    <input required value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Urugero: MINALOC/..." className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Urwego rwayitanze (Issuer)</label>
                    <input required value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="Urwego rwatangaje ishyirwaho" className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Itariki inyandiko yatangiweho</label>
                    <input type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
                  </div>
                </div>

                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  Iyi ntambwe ibika metadata y'icyemezo gusa; upload y'inyandiko (file) n'uburyo bwo kuyigenzura bizongerwamo mu gice cya document storage. Umuyobozi ntahita agaragara ku baturage ataragenzurwa kandi ngo profile ye isohorwe.
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold">Hagarika</button>
                  <button type="submit" disabled={createBusy || !unitReady || !selectedPosition} className="min-h-[44px] rounded-xl bg-[#20603D] px-5 text-sm font-bold text-white disabled:opacity-50">
                    {createBusy ? "Turimo kubika..." : "Ohereza ngo bisuzumwe"}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-2xl border border-border bg-card">
              <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div>
                  <h3 className="font-bold">Urutonde rw'abayobozi</h3>
                  <p className="text-xs text-muted-foreground">Amakuru agaragara hashingiwe ku burenganzira bwa konti yawe.</p>
                </div>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Shaka izina, umwanya cyangwa agace..." className="min-h-[40px] rounded-xl border border-input bg-background px-3 text-xs sm:w-64" />
              </div>
              {busy ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Turimo gufungura Registry...</p>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-semibold">Nta muyobozi urandikwa muri uru rwego.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Nta makuru y'icyitegererezo yongerwamo. Kanda "Andika umuyobozi" utangire kwandika amakuru yemewe.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredAppointments.map((item) => {
                    const caseItem = casesByAppointment.get(item.id);
                    const canReview = Boolean(caseItem && user && caseItem.submitted_by !== user.id);
                    const status = caseItem?.verification_status ?? item.appointment_status;
                    return (
                      <article key={item.id} className="space-y-3 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-bold">{item.person ? item.person.first_name + " " + item.person.last_name : "Umwirondoro utabonetse"}</p>
                            <p className="text-sm font-semibold text-[#00A3E0]">{item.position?.title_kiny ?? "Umwanya utazwi"}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.boundary?.name_kiny ?? "Agace katabonetse"} · {item.boundary?.level ?? ""}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${status === "approved" || status === "active" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {statusName[status] ?? status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Itariki: {item.effective_from}</span>
                          <span>Scope: {item.boundary?.scope_code ?? "—"}</span>
                          <span>Appointment ID: {item.id.slice(0, 8)}…</span>
                        </div>
                        {caseItem && (
                          <div className="rounded-xl bg-muted/30 p-3">
                            <div className="flex items-center gap-2 text-xs font-bold"><FileText className="h-4 w-4" /> Verification</div>
                            {caseItem.decision_reason && <p className="mt-1 text-xs text-muted-foreground">Impamvu: {caseItem.decision_reason}</p>}
                            {canReview && ["pending", "under_review"].includes(caseItem.verification_status) && (
                              <div className="mt-3 space-y-2">
                                {caseItem.verification_status === "under_review" && (
                                  <textarea
                                    value={reviewReasons[caseItem.id] ?? ""}
                                    onChange={(event) => setReviewReasons((current) => ({ ...current, [caseItem.id]: event.target.value }))}
                                    rows={2}
                                    placeholder="Andika impamvu y'icyemezo..."
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                  />
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {caseItem.verification_status === "pending" && (
                                    <button type="button" disabled={decisionBusyId === caseItem.id} onClick={() => decideCase(caseItem, "under_review")} className="min-h-[38px] rounded-lg border border-border px-3 text-xs font-bold hover:bg-background disabled:opacity-50">Tangira isuzuma</button>
                                  )}
                                  {caseItem.verification_status === "under_review" && (
                                    <>
                                      <button type="button" disabled={decisionBusyId === caseItem.id} onClick={() => decideCase(caseItem, "approved")} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Emeza</button>
                                      <button type="button" disabled={decisionBusyId === caseItem.id} onClick={() => decideCase(caseItem, "rejected")} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Anga</button>
                                    </>
                                  )}
                                  {decisionBusyId === caseItem.id && <span className="self-center text-xs text-muted-foreground">Turimo kubika...</span>}
                                </div>
                              </div>
                            )}
                            {caseItem.submitted_by === user?.id && ["pending", "under_review"].includes(caseItem.verification_status) && (
                              <p className="mt-2 text-xs text-amber-700">Wowe ni wowe watanze iyi dosiye; ntushobora kuyisuzuma cyangwa kuyemeza.</p>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedAppointmentId((current) => current === item.id ? null : item.id)}
                          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-[#00A3E0] hover:bg-muted"
                          aria-expanded={expandedAppointmentId === item.id}
                        >
                          {expandedAppointmentId === item.id ? "Hisha amakuru arambuye" : "Reba / Hindura amakuru arambuye"}
                        </button>
                        {expandedAppointmentId === item.id && item.person && (
                          <RegistryDetails
                            appointmentId={item.id}
                            personId={item.person_id}
                            caseId={caseItem?.id ?? null}
                            personName={item.person.first_name + " " + item.person.last_name}
                            firstName={item.person.first_name}
                            lastName={item.person.last_name}
                            personVersion={item.person.version}
                            onIdentityUpdated={(updatedPerson) => setAppointments((current) =>
                              current.map((row) => row.person_id === updatedPerson.id
                                ? { ...row, person: updatedPerson }
                                : row)
                            )}
                            positionName={item.position?.title_kiny ?? "Umwanya"}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "positions" && isNational && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold">Official Position Catalogue</h2>
              <p className="text-xs text-muted-foreground">Imyanya mishya ibanza kuba Draft. National Super Admin ni we uyemeza.</p>
            </div>
            <form onSubmit={createPosition} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold">Code (unique)</label>
                <input required value={positionCode} onChange={(event) => setPositionCode(event.target.value)} placeholder="village_leader" className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Urwego rukenewe</label>
                <select value={positionLevel} onChange={(event) => setPositionLevel(event.target.value as Position["required_boundary_level"])} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="country">Igihugu</option><option value="district">Akarere</option><option value="sector">Umurenge</option><option value="cell">Akagari</option><option value="village">Umudugudu</option>
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-semibold">Izina mu Kinyarwanda</label><input required value={titleKiny} onChange={(event) => setTitleKiny(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-semibold">Title in English</label><input required value={titleEng} onChange={(event) => setTitleEng(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-semibold">Titre en français</label><input required value={titleFra} onChange={(event) => setTitleFra(event.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm" /></div>
              <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={positionExclusive} onChange={(event) => setPositionExclusive(event.target.checked)} /> Umwanya umwe gusa muri buri gace (exclusive)</label>
              <div className="sm:col-span-2"><button type="submit" disabled={positionBusy} className="min-h-[44px] rounded-xl bg-[#20603D] px-5 text-sm font-bold text-white disabled:opacity-50">{positionBusy ? "Turimo kubika..." : "Bika nka Draft"}</button></div>
            </form>

            <div className="rounded-2xl border border-border bg-card">
              {positions.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nta myanya irandikwa.</p> : positions.map((position) => (
                <div key={position.id} className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-bold">{position.title_kiny}</p><p className="text-xs text-muted-foreground">{position.code} · {position.title_eng} · {levelName[position.required_boundary_level]}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold">{position.position_status}</span>
                    {position.position_status === "draft" && <button type="button" disabled={positionBusy} onClick={() => approvePosition(position)} className="min-h-[38px] rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white">Emeza umwanya</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "audit" && (
          <section className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4"><h2 className="font-bold">Audit & Accountability</h2><p className="text-xs text-muted-foreground">Amateka y'ibikorwa byakozwe n'abafite uburenganzira.</p></div>
            {audit.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nta gikorwa kirandikwa.</p> : audit.map((item) => (
              <div key={item.id} className="border-b border-border p-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{item.action} · {item.target_table}</p><time className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("rw-RW")}</time></div>
                <p className="mt-1 text-xs text-muted-foreground">{item.actor_role ?? "Ubuyobozi"} · {item.changed_fields.join(", ") || "Nta field yanditswe"}</p>
                {item.reason && <p className="mt-1 text-xs">Impamvu: {item.reason}</p>}
              </div>
            ))}
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <span>Province ni urwego rw'ahantu gusa; nta Province administrator tier iri muri Registry V2.</span>
          <Link href="/admin/login" className="inline-flex items-center gap-1 text-[#00A3E0]"><ArrowLeft className="h-3.5 w-3.5" /> Konti zitandukanye</Link>
        </footer>
      </div>
    </main>
  );
}
