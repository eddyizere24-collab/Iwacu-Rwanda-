/**
 * Travel profiles for Rwanda. Speeds are in km/h per road class and can be tuned here as real trips are measured.
 * Road classes (from the graph builder): 0 trunk, 1 primary, 2 secondary, 3 tertiary, 4 residential/unclassified,
 * 5 service, 6 track, 7 path, 8 footway/pedestrian, 9 steps, 10 cycleway. null means the mode may not use it.
 * Surfaces: 0 unknown, 1 paved, 2 unpaved.
 */

export type TravelMode = "car" | "moto" | "bike" | "foot";
export const TRAVEL_MODES: readonly TravelMode[] = ["car", "moto", "bike", "foot"] as const;

export type Profile = {
  speedKmh: ReadonlyArray<number | null>;
  /** multiplier on speed for an unpaved / unknown surface (unknown only applies to minor roads) */
  unpavedFactor: number;
  unknownMinorFactor: number;
  obeysOneWay: boolean;
  /** fastest speed in the table, used to bound searches */
  maxKmh: number;
};

function profile(speedKmh: ReadonlyArray<number | null>, unpavedFactor: number, unknownMinorFactor: number, obeysOneWay: boolean): Profile {
  return { speedKmh, unpavedFactor, unknownMinorFactor, obeysOneWay, maxKmh: Math.max(...speedKmh.filter((v): v is number => v != null)) };
}

export const PROFILES: Record<TravelMode, Profile> = {
  car: profile([60, 50, 40, 35, 25, 15, 10, null, null, null, null], 0.7, 0.85, true),
  moto: profile([60, 55, 45, 40, 30, 22, 18, 8, null, null, null], 0.8, 0.9, true),
  bike: profile([18, 18, 17, 16, 15, 13, 10, 8, 6, null, 15], 0.75, 0.9, true),
  foot: profile([4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 3, 4.5], 1, 1, false),
};

/** Walking speed used for the short leg between a point and the nearest road. */
export const ACCESS_KMH = 4.5;

export function edgeSpeedKmh(mode: TravelMode, cls: number, surf: number): number {
  const p = PROFILES[mode];
  const base = p.speedKmh[cls];
  if (base == null) return 0;
  if (surf === 2) return base * p.unpavedFactor;
  if (surf === 0 && cls >= 4) return base * p.unknownMinorFactor;
  return base;
}
