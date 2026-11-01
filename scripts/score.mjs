export const RADII = [0, 100, 500, 2000];
const EARTH_M = 6371008.8;

function bearingFor(point, radius) {
  const source = `${point.district_scope_code}:${point.idx}:${radius}:20261030`;
  let hash = 2166136261;
  for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return (hash / 0x100000000) * Math.PI * 2;
}

export function destination(point, radius) {
  const bearing = radius === 0 ? 0 : bearingFor(point, radius);
  const delta = radius / EARTH_M;
  const lat1 = point.latitude * Math.PI / 180;
  const lon1 = point.longitude * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(delta) * Math.cos(lat1),
    Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
  );
  return {
    latitude: lat2 * 180 / Math.PI,
    longitude: ((lon2 * 180 / Math.PI + 540) % 360) - 180
  };
}

export function requestPlan(points) {
  return points.flatMap(point => RADII.map(radius => ({
    key: `${point.district_scope_code}:${point.idx}:${radius}`,
    district: point.district,
    true_village_scope_code: point.true_village_scope_code,
    radius_m: radius,
    accuracy: Math.max(radius, 20),
    ...destination(point, radius),
  })));
}

export function evaluate(plan, httpStatus, body, latencyMs, fetchError = null) {
  const level = typeof body?.level === "string" ? body.level : "";
  const path = body?.path && typeof body.path === "object" ? body.path : {};
  const pathPresent = Object.values(path).some(value => typeof value === "string" && value.trim().length > 0);
  const chosen = body?.hierarchy?.[level]?.scope_code ??
    body?.per_level_candidates?.[level]?.[0]?.scope_code ?? "";
  const degraded = body?.degraded === true ||
    (Array.isArray(body?.flags) && body.flags.includes("degraded"));
  const empty = !level || !pathPresent || !chosen;
  const correct = Boolean(chosen) &&
    (plan.true_village_scope_code === chosen || plan.true_village_scope_code.startsWith(`${chosen}-`));
  const error = Boolean(fetchError) || httpStatus !== 200 || body?.status === "error";
  return {
    key: plan.key, district: plan.district, radius_m: plan.radius_m, level,
    chosen_scope_code: chosen, http_status: httpStatus, latency_ms: latencyMs,
    correct, empty, degraded, error, fetch_error: fetchError
  };
}

export function summarize(records) {
  return RADII.map(radius => {
    const rows = records.filter(row => row.radius_m === radius);
    const sorted = rows.map(row => row.latency_ms).sort((a, b) => a - b);
    const percentile = p => sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : null;
    const count = key => rows.filter(row => row[key]).length;
    return {
      radius_m: radius, requests: rows.length,
      correctness_pct: rows.length ? Number((100 * count("correct") / rows.length).toFixed(2)) : null,
      correct: count("correct"), empty: count("empty"), degraded: count("degraded"),
      errors: count("error"), p50_ms: percentile(0.50), p95_ms: percentile(0.95)
    };
  });
}

export function agreement(v1, v2) {
  return RADII.map(radius => {
    const left = new Map(v1.filter(row => row.radius_m === radius).map(row => [row.key, row]));
    const right = new Map(v2.filter(row => row.radius_m === radius).map(row => [row.key, row]));
    let same = 0, total = 0;
    for (const [key, a] of left) {
      const b = right.get(key);
      if (!b) continue;
      total += 1;
      if (a.level === b.level && a.chosen_scope_code === b.chosen_scope_code) same += 1;
    }
    return {
      radius_m: radius, compared: total,
      agreement_pct: total ? Number((100 * same / total).toFixed(2)) : null,
      same
    };
  });
}

export function plannedPreview(points) {
  return requestPlan(points).slice(0, 5).map(({ key, district, radius_m, accuracy, latitude, longitude }) => ({
    key, district, radius_m, accuracy,
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7))
  }));
}
