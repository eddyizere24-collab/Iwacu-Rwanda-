import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("emergency national seed / public json", () => {
  it("public emergency-national.json exists and is valid JSON", () => {
    const path = join(process.cwd(), "public/emergency-national.json");
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, "utf8"));
    expect(Array.isArray(data) || typeof data === "object").toBe(true);
  });

  it("contains police or 112 style numbers when array", () => {
    const path = join(process.cwd(), "public/emergency-national.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    const text = JSON.stringify(data);
    expect(/112|113|police|Polisi/i.test(text)).toBe(true);
  });
});
