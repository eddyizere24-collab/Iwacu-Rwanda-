// Generates the stored Kinyarwanda phrase audio (public/voice/rw) from src/lib/remote-agent/rw-phrases.json
// using Pindo's public Kinyarwanda TTS. Run from GitHub Actions (workflow "Generate Kinyarwanda voice").
import { readFile, writeFile, mkdir } from "node:fs/promises";

const phrases = JSON.parse(await readFile("src/lib/remote-agent/rw-phrases.json", "utf8"));
const outDir = "public/voice/rw";
await mkdir(outDir, { recursive: true });

const manifest = {};
let failed = 0;
for (const [id, text] of Object.entries(phrases)) {
  try {
    const response = await fetch("https://api.pindo.io/ai/tts/rw/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: "rw", speech_rate: 1.0 }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`TTS ${response.status}: ${body.slice(0, 200)}`);
    const payload = JSON.parse(body);
    const raw = payload?.data?.generated_audio_url;
    if (payload.status !== "success" || !raw) throw new Error(`bad payload: ${body.slice(0, 200)}`);
    const url = new URL(raw, "https://api.pindo.io/");
    if (url.protocol !== "https:" || !url.hostname.endsWith("pindo.io")) throw new Error(`rejected url ${url}`);
    const audio = await fetch(url);
    if (!audio.ok) throw new Error(`download ${audio.status}`);
    const type = audio.headers.get("content-type") ?? "";
    const ext = type.includes("wav") ? "wav" : type.includes("ogg") ? "ogg" : "mp3";
    const file = `${id}.${ext}`;
    await writeFile(`${outDir}/${file}`, Buffer.from(await audio.arrayBuffer()));
    manifest[text.replace(/\s+/g, " ").trim()] = `/voice/rw/${file}`;
    console.log("ok", id, type, file);
  } catch (error) {
    failed += 1;
    console.error("FAILED", id, error instanceof Error ? error.message : String(error));
  }
}
await writeFile(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
if (failed > 0) process.exit(1);
