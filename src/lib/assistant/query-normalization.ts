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
  genocid: "genocide",
  genocied: "genocide",
  abatutzi: "abatutsi",
  abatusi: "abatutsi",
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
  umuyobzi: "umuyobozi",
  umudugud: "umudugudu",
  gafit: "gafite",
  amteka: "amateka",
  amatheka: "amateka",
  imiteguro: "imyiteguro",
  imitegur: "imyiteguro",
  interahame: "interahamwe",
  gacacaa: "gacaca",
  surviver: "survivor",
  survivers: "survivors",
  survivours: "survivors",
  preperation: "preparation",
  preparaton: "preparation",
  histroy: "history",
  historry: "history",
  commemorationn: "commemoration",
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
