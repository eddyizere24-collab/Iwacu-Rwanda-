/**
 * Road-sign / nearby-sign capability for Ishakiro.
 *
 * Verified legal context is cited, but IWACU has no verified, geolocated
 * inventory of installed road signs. Therefore nearby signs always remain
 * unavailable. Never invent sign names, meanings, positions or photos.
 */

export type SignsStatus = "unavailable";

export interface SignsResult {
  status: SignsStatus;
  signs: [];
  message_kiny: string;
  source_label: string;
  source_url: string;
  data_date: string;
}

const ROAD_TRAFFIC_LAW_SOURCE_URL =
  "https://www.minijust.gov.rw/fileadmin/user_upload/Minijust/Official_gazettes_2/____2026_Igazeti_ya_Leta/______WERURWE-March-Mars/OG_n___Special_of_10.03.2026__Ikoreshwa_ry_umuhanda.pdf";

export function lookupNearbySigns(_query: string): SignsResult {
  return {
    status: "unavailable",
    signs: [],
    message_kiny:
      "Itegeko n° 014/2026 ryo ku wa 06/03/2026, ryasohotse mu Igazeti ya Leta yo ku wa 10/03/2026, mu ngingo ya 5(1)(g) rivuga ko ibimenyetso bigenga ikoreshwa ry'umuhanda biri mu mategeko agenga umuhanda. Ingingo ya 5(2) ivuga ko ibisobanuro birambuye bizashyirwaho n'Iteka rya Minisitiri. Ariko IWACU ntirafite urutonde rw'ibyapa rwemejwe rugaragaza buri cyapa n'aho giherereye. Ntabwo nshobora kwemeza icyapa kiri hafi yawe cyangwa kuguhereza urutonde rwacyo ntashingiye ku makuru yagenzuwe.",
    source_label:
      "Igazeti ya Leta n° Special yo ku wa 10/03/2026 — Itegeko n° 014/2026, Ingingo ya 5",
    source_url: ROAD_TRAFFIC_LAW_SOURCE_URL,
    data_date: "2026-03-10",
  };
}
