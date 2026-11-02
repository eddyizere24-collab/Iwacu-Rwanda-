/**
 * Progressive offline boundary cache (nationwide-ready)
 */

const DB_NAME = "iwacu-offline";
const STORE = "sector-geojson";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "scope_code" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedSector(
  scopeCode: string
): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(scopeCode);
      req.onsuccess = () => {
        const row = req.result as { geojson?: GeoJSON.FeatureCollection } | undefined;
        resolve(row?.geojson ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function putCachedSector(
  scopeCode: string,
  geojson: GeoJSON.FeatureCollection
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      scope_code: scopeCode,
      geojson,
      cached_at: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function sectorCodeFromScope(scopeCode: string): string {
  const parts = scopeCode.split("-");
  if (parts.length >= 4) return parts.slice(0, 4).join("-");
  return scopeCode;
}

export async function warmSectorCache(scopeCode: string): Promise<void> {
  if (typeof window === "undefined") return;
  const sector = sectorCodeFromScope(scopeCode);
  const existing = await getCachedSector(sector);
  if (existing) return;
  try {
    const res = await fetch(`/offline/sectors/${sector}.geojson`, {
      cache: "force-cache",
    });
    if (!res.ok) return;
    const geojson = (await res.json()) as GeoJSON.FeatureCollection;
    await putCachedSector(sector, geojson);
  } catch {
    /* offline or not yet published */
  }
}
