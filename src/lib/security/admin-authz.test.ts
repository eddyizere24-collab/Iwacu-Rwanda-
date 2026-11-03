import assert from "node:assert/strict";
import test from "node:test";
import { canAssignLeaderScope, isWithinAdminScope, ROLE_LEVEL } from "./admin-authz";

test("canonical scope matching respects complete path segments", () => {
  assert.equal(isWithinAdminScope("RW-P1-D1", "RW-P1-D1-S1"), true);
  assert.equal(isWithinAdminScope("RW-P1-D1", "RW-P1-D10"), false);
});
test("leader roles map to their official administrative level", () => {
  assert.equal(ROLE_LEVEL["Village Leader"], "village");
  assert.equal(ROLE_LEVEL["Cell Executive Secretary"], "cell");
  assert.equal(ROLE_LEVEL["Sector Executive Secretary"], "sector");
  assert.equal(ROLE_LEVEL.Mayor, "district");
  assert.equal(ROLE_LEVEL["Vice Mayor"], "district");
  assert.equal(ROLE_LEVEL["District Executive Secretary"], "district");
});
test("non-national admins can only add leaders at a lower administrative level inside their scope", () => {
  const district = { isSuperAdmin: false, adminScopeCode: "RW-P1-D1", adminScopeLevel: "district" as const };
  assert.equal(canAssignLeaderScope({ ...district, targetScopeCode: "RW-P1-D1-S1", targetLevel: "sector" }), true);
  assert.equal(canAssignLeaderScope({ ...district, targetScopeCode: "RW-P1-D1", targetLevel: "district" }), false);
  assert.equal(canAssignLeaderScope({ ...district, targetScopeCode: "RW-P1-D10-S1", targetLevel: "sector" }), false);
  assert.equal(canAssignLeaderScope({ ...district, adminScopeLevel: "sector", targetScopeCode: "RW-P1-D1-S1-C1", targetLevel: "cell" }), true);
  assert.equal(canAssignLeaderScope({ ...district, adminScopeLevel: "cell", targetScopeCode: "RW-P1-D1-S1-C1-V1", targetLevel: "village" }), true);
});
test("national super admin may assign leaders anywhere", () => {
  assert.equal(canAssignLeaderScope({
    isSuperAdmin: true, adminScopeCode: "RW", adminScopeLevel: "country",
    targetScopeCode: "RW-P1-D1", targetLevel: "district",
  }), true);
});
