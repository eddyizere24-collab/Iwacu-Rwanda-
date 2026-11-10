export type CountryFactLanguage = "rw" | "en" | "fr";

export interface RwandaCountryFactAnswer {
  answer: string;
  source: { label: string; data_date: null; url: string; trust_tier: "official_government" };
  dataDateLabel: string;
  confidenceLabel: string;
  suggestions: string[];
}

const SOURCE = {
  label: "Government of Rwanda — Overview",
  data_date: null,
  url: "https://www.gov.rw/overview",
  trust_tier: "official_government" as const,
};

const COUNTS = { provinces: 4, districts: 30, sectors: 416, cells: 2148, villages: 14837 } as const;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

function languageOf(query: string): CountryFactLanguage {
  const text = normalize(query);
  if (/\b(combien|districts? du rwanda|le rwanda|provinces? du rwanda|secteurs?|cellules?|villages?|et\s+(?:les?\s+)?(?:districts?|secteurs?|cellules?|villages?|provinces?))\b/.test(text)) return "fr";
  if (/\b(how many|how much|in rwanda|rwanda has|rwanda have|districts? in|provinces? in|sectors? in|cells? in|villages?|and\s+(?:the\s+)?(?:districts?|sectors?|cells?|villages?|provinces?)|what about)\b/.test(text)) return "en";
  return "rw";
}

function levelOf(query: string): keyof typeof COUNTS | "overview" | null {
  const text = normalize(query);
  if (/\b(uturere|akarere|districts?|district)\b/.test(text)) return "districts";
  if (/\b(intara|provinces?|province)\b/.test(text)) return "provinces";
  if (/\b(imirenge|umurenge|sectors?|sector)\b/.test(text)) return "sectors";
  if (/\b(utugari|akagari|cells?|cell)\b/.test(text)) return "cells";
  if (/\b(imidugudu|umudugudu|villages?|village)\b/.test(text)) return "villages";
  if (/\b(ubuyobozi|administrative|administration|inzego|structure|structures)\b/.test(text)) return "overview";
  return null;
}

/** Answers only facts published by the Government of Rwanda Overview page. */
export function getRwandaAdministrativeFact(query: string): RwandaCountryFactAnswer | null {
  const level = levelOf(query);
  if (!level) return null;
  const language = languageOf(query);
  let answer: string;
  let suggestions: string[];

  if (level === "overview") {
    answer = language === "en"
      ? "Rwanda has 4 provinces and the City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages."
      : language === "fr"
        ? "Le Rwanda compte 4 provinces et la Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages."
        : "U Rwanda rufite Intara 4 n'Umujyi wa Kigali, uturere 30, imirenge 416, utugari 2,148 n'imidugudu 14,837.";
    suggestions = language === "en" ? ["How many districts are in Rwanda?", "How many sectors are in Rwanda?"]
      : language === "fr" ? ["Combien de districts compte le Rwanda ?", "Combien de secteurs compte le Rwanda ?"]
        : ["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"];
  } else if (level === "districts") {
    answer = language === "en" ? "Rwanda has 30 districts."
      : language === "fr" ? "Le Rwanda compte 30 districts."
        : "U Rwanda rugizwe n'uturere 30.";
    suggestions = language === "en" ? ["How many sectors are in Rwanda?", "What are Rwanda's provinces?"]
      : language === "fr" ? ["Combien de secteurs compte le Rwanda ?", "Quelles sont les provinces du Rwanda ?"]
        : ["U Rwanda rufite imirenge ingahe?", "U Rwanda rufite intara zingahe?"];
  } else if (level === "provinces") {
    answer = language === "en" ? "Rwanda has 4 provinces. The City of Kigali is listed separately alongside the provinces."
      : language === "fr" ? "Le Rwanda compte 4 provinces. La Ville de Kigali est indiquée séparément des provinces."
        : "U Rwanda rufite Intara 4. Umujyi wa Kigali ugaragazwa ukwawo, utabarirwa muri izo Ntara 4.";
    suggestions = language === "en" ? ["How many districts are in Rwanda?", "How many sectors are in Rwanda?"]
      : language === "fr" ? ["Combien de districts compte le Rwanda ?", "Combien de secteurs compte le Rwanda ?"]
        : ["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"];
  } else {
    const values = {
      sectors: { rw: "imirenge 416", en: "416 sectors", fr: "416 secteurs" },
      cells: { rw: "utugari 2,148", en: "2,148 cells", fr: "2 148 cellules" },
      villages: { rw: "imidugudu 14,837", en: "14,837 villages", fr: "14 837 villages" },
    } as const;
    const value = values[level][language];
    answer = language === "en" ? `Rwanda has ${value}.`
      : language === "fr" ? `Le Rwanda compte ${value}.`
        : `U Rwanda rufite ${value}.`;
    suggestions = language === "en" ? ["How many districts are in Rwanda?", "How many sectors are in Rwanda?"]
      : language === "fr" ? ["Combien de districts compte le Rwanda ?", "Combien de secteurs compte le Rwanda ?"]
        : ["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"];
  }

  return {
    answer,
    source: SOURCE,
    dataDateLabel: "Itariki imibare yavuguriweho ntiyatangajwe ku rupapuro rw'inkomoko.",
    confidenceLabel: "Iyi mibare yatangajwe ku rubuga rwa Leta y'u Rwanda; itariki y'ivugurura ryayo ntiyagaragajwe.",
    suggestions,
  };
}

export function getRwandaAdministrativeCounts() {
  return { ...COUNTS };
}
