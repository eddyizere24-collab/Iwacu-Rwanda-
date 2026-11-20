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
  umudugud: "umudugudu",
  amteka: "amateka",
  amatheka: "amateka",
  imiteguro: "imyiteguro",
  imitegur: "imyiteguro",
  interahame: "interahamwe",
  gacacaa: "gacaca",
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

const SAFE_CANONICAL_TOKENS = [
  "akarere", "uturere", "umurenge", "imirenge", "akagari", "utugari",
  "umudugudu", "imidugudu", "intara", "umuyobozi", "abayobozi",
  "ubuyobozi", "ninde", "ifite", "gafite", "angahe",
  "jenoside", "abatutsi", "kwibuka", "amateka", "imyiteguro",
  "interahamwe", "gacaca", "genocide", "survivor", "survivors",
  "history", "historical", "preparation", "planning", "definition",
  "commemoration", "justice", "tribunal", "rescap", "temoignage",
] as const;

function oneEditApart(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1 || left === right) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  if (i < left.length || j < right.length) edits += 1;
  return edits === 1;
}

function correctSafeToken(token: string): string {
  const alias = SAFE_TOKEN_ALIASES[token];
  if (alias) return alias;
  if (token.length < 5) return token;
  const candidates = SAFE_CANONICAL_TOKENS.filter((candidate) => oneEditApart(token, candidate));
  return candidates.length === 1 ? candidates[0] : token;
}

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
    .map(correctSafeToken)
    .join(" ");
}
