import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAccountInput, childLevelFor, generateTempPassword, loginToEmail, makeLoginName,
  OFFICE_EMAIL_DOMAIN, passwordProblem, roleForLevel, slugName,
} from "./office-logic";

test("each tier creates only the tier directly below", () => {
  assert.equal(childLevelFor("national_super_admin"), "district");
  assert.equal(childLevelFor("district_admin"), "sector");
  assert.equal(childLevelFor("sector_admin"), "cell");
  assert.equal(childLevelFor("cell_admin"), null);
  assert.equal(roleForLevel("district"), "district_admin");
  assert.equal(roleForLevel("sector"), "sector_admin");
  assert.equal(roleForLevel("cell"), "cell_admin");
  assert.equal(roleForLevel("village"), null);
  assert.equal(roleForLevel("country"), null);
});

test("login names are plain ascii and unique-ish", () => {
  assert.equal(slugName("Mukamana Alice"), "mukamana.alice");
  assert.equal(slugName("  Uwiringiyimana  J. Pierre "), "uwiringiyimana.j.pierre");
  assert.equal(slugName("Élodie Nyirahabimana"), "elodie.nyirahabimana");
  assert.equal(slugName("???"), "umuyobozi");
  assert.match(makeLoginName("Mukamana Alice", () => 0.5), /^mukamana\.alice\.[0-9]{3}$/);
  assert.ok(slugName("x".repeat(80)).length <= 28);
});

test("a login name or an email both work at sign-in", () => {
  assert.equal(loginToEmail("Mukamana.Alice.123"), "mukamana.alice.123@" + OFFICE_EMAIL_DOMAIN);
  assert.equal(loginToEmail(" Admin@Example.rw "), "admin@example.rw");
});

test("temporary passwords are 10 characters, unambiguous, and pass the password rule", () => {
  let n = 0;
  const pwd = generateTempPassword((max) => (n++ * 7) % max);
  assert.equal(pwd.length, 10);
  assert.ok(!/[01OIl]/.test(pwd));
  assert.equal(passwordProblem("short1"), "Ijambo ry'ibanga rigomba kuba nibura inyuguti 8.");
  assert.equal(passwordProblem("onlyletters"), "Shyiramo inyuguti n'imibare.");
  assert.equal(passwordProblem("good2password"), null);
});

test("account input checks", () => {
  assert.equal(checkAccountInput({ full_name: "Ab" }), null);
  assert.ok(checkAccountInput({ full_name: "A" }));
  assert.ok(checkAccountInput({ full_name: "Alice", phone: "abc" }));
  assert.equal(checkAccountInput({ full_name: "Alice", phone: "+250 788 000 001" }), null);
});
