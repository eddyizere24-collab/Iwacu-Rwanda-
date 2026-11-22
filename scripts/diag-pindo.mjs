const tests = {
  short_name: "Muraho! Nitwa Iwacu Agent.",
  short_where: "Nshobora kukubwira aho uri.",
  apostrophe_short: "Nimero z'ubutabazi.",
  apostrophe_long: "Nshobora gusoma nimero z'ubutabazi, kukubwira abayobozi bawe no gusubiza ibibazo.",
  len80: "Nshobora kukubwira aho uri, gusoma nimero zubutabazi, kukubwira abayobozi bawe.",
  len120: "Nshobora kukubwira aho uri, gusoma nimero zubutabazi, kukubwira abayobozi bawe, gusoma uru rupapuro no gusubiza ibibazo.",
  len170: "Nshobora kukubwira aho uri, gusoma nimero zubutabazi, kukubwira abayobozi bawe, gusoma uru rupapuro no gusubiza ibibazo ku Rwanda. Mbwira ijambo rimwe gusa, urugero: aho ndi.",
  exclaim: "Muraho! Niteguye kugufasha.",
};
for (const [name, text] of Object.entries(tests)) {
  const r = await fetch("https://api.pindo.io/ai/tts/rw/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: "rw", speech_rate: 1.0 }) });
  const b = await r.text();
  let host = "";
  try { host = new URL(JSON.parse(b).data.generated_audio_url).hostname; } catch {}
  console.log("RESULT", name, text.length, r.status, host, b.slice(0, 90));
}
