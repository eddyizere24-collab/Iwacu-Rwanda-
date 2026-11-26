import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const EXCLUDED = new Set([
  "scripts/repo-size-audit.mjs",
  ".github/workflows/repo-size-audit.yml",
  "docs/REPOSITORY_SIZE_AND_VALUE_AUDIT_2026-11-26.md",
]);
const CODE_EXT = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".css",".scss",".html",".py",".sh",".sql"]);
const APP_EXT = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".css",".scss",".html"]);

function countLines(text) {
  if (!text.length) return 0;
  const breaks = (text.match(/\r\n|\n|\r/g) || []).length;
  return breaks + (/(?:\r\n|\n|\r)$/.test(text) ? 0 : 1);
}
function add(bucket, stats) {
  bucket.files++;
  bucket.bytes += stats.bytes;
  bucket.lines += stats.lines;
  bucket.chars += stats.chars;
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full.replaceAll(path.sep, "/"));
  }
  return out;
}
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean).filter(p => !EXCLUDED.has(p));
const files = tracked.filter(p => fs.existsSync(p) && fs.statSync(p).isFile());
const result = {
  generatedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  rules: {
    lineCount: "newline-delimited physical lines; final non-newline-terminated content counts as one line",
    characterCount: "Unicode code points after UTF-8 decoding; line endings are included as characters",
    textDetection: "UTF-8 fatal decoder; binary if invalid UTF-8 or contains NUL",
    exclusions: [...EXCLUDED],
  },
  totals: {
    trackedFiles: files.length, trackedBytes: 0, textFiles: 0, textBytes: 0,
    textLines: 0, textCharacters: 0, binaryFiles: 0, binaryBytes: 0,
  },
  categories: {},
  extensions: {},
  largestFiles: [],
  largestDirectories: [],
};
const categories = {
  firstPartyAppSource: { files:0, bytes:0, lines:0, chars:0 },
  sourceCodeAllIncludingTestsAndVendor: { files:0, bytes:0, lines:0, chars:0 },
  tests: { files:0, bytes:0, lines:0, chars:0 },
  sql: { files:0, bytes:0, lines:0, chars:0 },
  scripts: { files:0, bytes:0, lines:0, chars:0 },
  documentation: { files:0, bytes:0, lines:0, chars:0 },
  configurationAndWorkflow: { files:0, bytes:0, lines:0, chars:0 },
  structuredDataText: { files:0, bytes:0, lines:0, chars:0 },
  vendoredCode: { files:0, bytes:0, lines:0, chars:0 },
  binaryAssets: { files:0, bytes:0, lines:0, chars:0 },
};
const directoryBytes = {};
const fileRows = [];
for (const file of files) {
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase() || "[no extension]";
  const dir = path.dirname(file).split("/")[0] || ".";
  directoryBytes[dir] = (directoryBytes[dir] || 0) + buf.length;
  result.totals.trackedBytes += buf.length;
  result.extensions[ext] ||= { files:0, bytes:0, lines:0, chars:0 };
  result.extensions[ext].files++;
  result.extensions[ext].bytes += buf.length;
  let content = "";
  let isText = !buf.includes(0);
  if (isText) {
    try { content = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { isText = false; }
  }
  const stats = isText
    ? { bytes:buf.length, lines:countLines(content), chars:[...content].length }
    : { bytes:buf.length, lines:0, chars:0 };
  if (isText) {
    result.totals.textFiles++;
    result.totals.textBytes += stats.bytes;
    result.totals.textLines += stats.lines;
    result.totals.textCharacters += stats.chars;
    result.extensions[ext].lines += stats.lines;
    result.extensions[ext].chars += stats.chars;
  } else {
    result.totals.binaryFiles++;
    result.totals.binaryBytes += buf.length;
  }
  const segments = file.split("/");
  const baseName = path.basename(file).toLowerCase();
  const vendor = segments.includes("vendor") || segments.includes("node_modules");
  const isCode = isText && CODE_EXT.has(ext);
  const isAppCode = isText && APP_EXT.has(ext);
  const isTest = isCode && (segments.some(part => ["test", "tests", "__tests__"].includes(part.toLowerCase())) || baseName.includes(".test.") || baseName.includes(".spec."));
  if (isCode) add(categories.sourceCodeAllIncludingTestsAndVendor, stats);
  if (isTest) add(categories.tests, stats);
  if (isText && ext === ".sql") add(categories.sql, stats);
  if (isText && [".md",".mdx",".txt"].includes(ext)) add(categories.documentation, stats);
  if (isText && [".yml",".yaml",".json",".toml",".ini",".conf",".example",".lock",".gitignore"].includes(ext)) add(categories.configurationAndWorkflow, stats);
  if (isText && [".json",".csv",".xml",".geojson"].includes(ext)) add(categories.structuredDataText, stats);
  if (isText && vendor && isCode) add(categories.vendoredCode, stats);
  if (!isText) add(categories.binaryAssets, { ...stats, lines:0, chars:0 });
  if (isText && isAppCode && file.startsWith("src/") && !isTest && !vendor) add(categories.firstPartyAppSource, stats);
  if (isText && file.startsWith("scripts/") && isCode && !isTest) add(categories.scripts, stats);
  fileRows.push({ path:file, bytes:buf.length, lines:stats.lines, chars:stats.chars, text:isText });
}
result.categories = categories;
result.largestFiles = fileRows.sort((a,b)=>b.bytes-a.bytes).slice(0,50);
result.largestDirectories = Object.entries(directoryBytes)
  .map(([directory,bytes])=>({directory,bytes})).sort((a,b)=>b.bytes-a.bytes);
const outputDir = "repo-size-audit-output";
fs.mkdirSync(outputDir, { recursive:true });
fs.writeFileSync(path.join(outputDir,"repo-size-audit.json"), JSON.stringify(result,null,2)+"\n");
const mb = n => (n/1e6).toFixed(2)+" MB";
const lines = [
  "# IWACU RWANDA repository size audit",
  "",
  "Commit: " + result.commit,
  "Generated: " + result.generatedAt,
  "",
  "## Totals",
  "- Tracked files: " + result.totals.trackedFiles,
  "- Total tracked bytes: " + result.totals.trackedBytes + " (" + mb(result.totals.trackedBytes) + ")",
  "- UTF-8 text files: " + result.totals.textFiles,
  "- UTF-8 text bytes: " + result.totals.textBytes + " (" + mb(result.totals.textBytes) + ")",
  "- Text physical lines: " + result.totals.textLines,
  "- Text Unicode characters: " + result.totals.textCharacters,
  "- Binary files: " + result.totals.binaryFiles,
  "- Binary bytes: " + result.totals.binaryBytes + " (" + mb(result.totals.binaryBytes) + ")",
  "",
  "## Code categories",
  ...Object.entries(categories).map(([k,v])=>"- " + k + ": " + v.files + " files, " + v.bytes + " bytes, " + v.lines + " lines, " + v.chars + " Unicode characters"),
  "",
  "## Largest top-level directories",
  ...result.largestDirectories.map(x=>"- " + x.directory + ": " + x.bytes + " bytes (" + mb(x.bytes) + ")"),
  "",
  "## Largest files",
  ...result.largestFiles.slice(0,30).map(x=>"- " + x.path + ": " + x.bytes + " bytes (" + x.lines + " lines, " + x.chars + " chars)"),
  "",
  "## Counting notes",
  "- Counts only tracked files in the audited Git commit.",
  "- Two temporary audit-instrument files were excluded so they do not inflate the project's original file/line totals.",
  "- Lines count physical text lines, including a final line that has no trailing newline.",
  "- Characters are Unicode code points after UTF-8 decoding and include line-ending characters.",
  "- Binary files are excluded from line and character totals.",
  "- Vendored source and tests are reported separately; code totals are not presented as lines written exclusively by the project owner.",
];
const report = lines.join("\n")+"\n";
fs.writeFileSync(path.join(outputDir,"repo-size-audit.md"),report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
console.log(JSON.stringify({totals:result.totals,categories:result.categories,largestDirectories:result.largestDirectories,largestFiles:result.largestFiles.slice(0,20)},null,2));
