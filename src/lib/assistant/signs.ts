/**
 * Road-sign / nearby-sign capability for Ishakiro.
 *
 * No verified road-sign dataset is connected on this branch.
 * Always returns unavailable. Never invents sign names, positions or photos.
 */

export type SignsStatus = "unavailable";

export interface SignsResult {
  status: SignsStatus;
  signs: [];
  message_kiny: string;
  source_label: string;
}

export function lookupNearbySigns(_query: string): SignsResult {
  return {
    status: "unavailable",
    signs: [],
    message_kiny:
      "Kumenya ibyapa n'ibimenyetso biri hafi ntabwo bishoboka ubu. Nta dataset y'ibyapa yagenzuwe ihujwe. Ntabwo nzahimba amazina cyangwa ahantu h'ibyapa.",
    source_label: "verified road-sign dataset (not connected)",
  };
}
