import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = join(process.cwd());

describe("sql bundle", () => {
  it("has apply_all.sql", () => {
    expect(existsSync(join(root, "sql/apply_all.sql"))).toBe(true);
  });

  it("has core migrations", () => {
    expect(existsSync(join(root, "sql/migrations/001_core_schema.sql"))).toBe(true);
    expect(existsSync(join(root, "sql/migrations/002_leaders_workflow.sql"))).toBe(true);
    expect(existsSync(join(root, "sql/migrations/003_contacts_roles_emergency.sql"))).toBe(true);
  });

  it("apply_all mentions postgis or extensions", () => {
    const sql = readFileSync(join(root, "sql/apply_all.sql"), "utf8");
    expect(sql.length).toBeGreaterThan(100);
    expect(/postgis|extension|CREATE TABLE/i.test(sql)).toBe(true);
  });
});
