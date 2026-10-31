export type LocateMethod = "gps" | "map" | "network" | "ip";

export interface LocateCacheKeyInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  method: LocateMethod;
}

export function getAccuracyBucket(accuracy: number): number {
  const bounds = [10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000];
  const upper = bounds.find((bound) => accuracy <= bound);
  return upper ?? Math.ceil(accuracy / 50_000) * 50_000;
}

export function buildLocateCacheKey(input: LocateCacheKeyInput): string {
  return [
    input.latitude.toFixed(4),
    input.longitude.toFixed(4),
    String(getAccuracyBucket(input.accuracy)),
    input.method,
  ].join(":");
}

export function getLocateConfidenceRpcName(value?: string): "calculate_location_confidence" | "calculate_location_confidence_v2" {
  return value?.trim().toLowerCase() === "v2"
    ? "calculate_location_confidence_v2"
    : "calculate_location_confidence";
}

export interface InMemoryCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export function createInMemoryCache<T>(options: InMemoryCacheOptions = {}) {
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000;
  const maxEntries = options.maxEntries ?? 2_000;
  const now = options.now ?? Date.now;
  const entries = new Map<string, { expiresAt: number; value: T }>();

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      entries.delete(key);
      entries.set(key, { expiresAt: now() + ttlMs, value });
      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    },
    delete(key: string): boolean {
      return entries.delete(key);
    },
    clear(): void {
      entries.clear();
    },
    get size(): number {
      return entries.size;
    },
  };
}

export interface IpRateLimiterOptions {
  limit?: number;
  windowMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export function createIpRateLimiter(options: IpRateLimiterOptions = {}) {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const maxEntries = options.maxEntries ?? 20_000;
  const now = options.now ?? Date.now;
  const windows = new Map<string, { startedAt: number; count: number }>();

  return {
    consume(ip: string): boolean {
      const timestamp = now();
      for (const [key, window] of windows) {
        if (timestamp - window.startedAt >= windowMs) windows.delete(key);
      }

      const key = ip || "unknown";
      const current = windows.get(key);
      if (!current || timestamp - current.startedAt >= windowMs) {
        windows.set(key, { startedAt: timestamp, count: 1 });
        while (windows.size > maxEntries) {
          const oldestKey = windows.keys().next().value;
          if (oldestKey === undefined) break;
          windows.delete(oldestKey);
        }
        return true;
      }
      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    },
    clear(): void {
      windows.clear();
    },
  };
}

export type RpcCallOutcome<T> =
  | { kind: "success"; value: T }
  | { kind: "timeout" }
  | { kind: "error"; error: unknown };

export async function callRpcWithTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 2_500,
): Promise<RpcCallOutcome<T>> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const requestPromise: Promise<RpcCallOutcome<T>> = Promise.resolve()
    .then(() => request(controller.signal))
    .then(
      (value) => ({ kind: "success", value }) as const,
      (error: unknown) => timedOut
        ? ({ kind: "timeout" } as const)
        : ({ kind: "error", error } as const),
    );

  const timeoutPromise = new Promise<RpcCallOutcome<T>>((resolve) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve({ kind: "timeout" });
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export function createHttp200Fallback<T extends object>(
  body: T,
  degraded = false,
): { status: 200; body: T | (T & { degraded: true }) } {
  return {
    status: 200,
    body: degraded ? { ...body, degraded: true } : body,
  };
}
