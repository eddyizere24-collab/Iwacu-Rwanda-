/**
 * Conservative typo and spelling normalization for Ishakiro queries.
 *
 * Only a small, reviewed vocabulary is corrected automatically. Place names
 * are deliberately excluded here: they are matched against the official
 * administrative index with a separate uniqueness check.
 */

const SAFE_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  jenocide: "jenoside",
  genoside: "jenoside",
  jenosid: "jenoside",
  jenoside: "jenoside",
  genocid: "genocide",
  genocied: "genocide",
  abatutsi: "abatutsi",
  abatutzi: "abatutsi",
  abatusi: "abatutsi",
  abatutsi: "abatutsi",
  kwibuk: "kwibuka",
  kwibukka: "kwibuka",
  kwibukaa: "kwibuka",
  akagali: "akagari",
  akagarii: "akagari",
  akarare: "akarere",
  akareri: "akarere",
  akare: "akarere",
  umureng: "umurenge",
  umurenje: "umurenge",
  umurengee: "umurenge",
  abayozi: "abayobozi",
  abayobozii: "abayobozi",
  umuyoboz: "umuyobozi",
  umuyobozi: "umuyobozi",
  umudugud: "umudugudu",
  umudugudu: "umudugudu",
  amteka: "amateka",
  amatheka: "amateka",
  imiteguro: "imyiteguro",
  imitegur: "imyiteguro",
  interahame: "interahamwe",
  interahamwe: "interahamwe",
  gacacaa: "gacaca",
  gacaca: "gacaca",
  surviver: "survivor",
  survivers: "survivors",
  survivours: "survivors",
  genocidaires: "genocide",
  preperation: "preparation",
  preparaton: "preparation",
  histroy: "history",
  historry: "history",
  commemorationn: "commemoration",
  commemoration: "commemoration",
  rescapés: "rescapés",
  rescapé: "rescapé",
};

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize spelling variants without rewriting sentence structure or
 * guessing the visitor's meaning.
 */
export function normalizeAssistantQuery(value: string): string {
  const text = fold(value)
    .replace(/\bniiki\b/g, "ni iki")
    .replace(/\byabayeiki\b/g, "yabaye iki")
    .replace(/\babacitsekuicumu\b/g, "abacitse ku icumu");
  return text
    .split(" ")
    .map((token) => SAFE_TOKEN_ALIASES[token] ?? token)
    .join(" ");
}
