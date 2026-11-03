/**
 * Public location-confidence wording.
 * provisional, to be recalibrated against observed hit rates.
 */
export type LocationConfidence = "Byizewe" | "Giciriritse" | "Gicye";

export function confidenceLabel(value:number|null|undefined):LocationConfidence {
  if(typeof value!=="number"||!Number.isFinite(value))return "Gicye";
  if(value>=0.80)return "Byizewe";
  if(value>=0.50)return "Giciriritse";
  return "Gicye";
}
