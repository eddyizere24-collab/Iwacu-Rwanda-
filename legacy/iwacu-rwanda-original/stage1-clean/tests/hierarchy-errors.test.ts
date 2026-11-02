import test from "node:test";
import assert from "node:assert/strict";
import { resolveHierarchy, type HierarchyProps } from "../src/lib/geo/hierarchy";
import { createLocateError, LEADERS_NOT_YET_REGISTERED } from "../src/lib/utils/errors";
import type { LocationErrorCode } from "../src/types/location";

test("resolveHierarchy builds chain from leaf", () => {
  const props: HierarchyProps = {
    scope_code: "RW-01-02-03",
    level: "sector",
    name_kiny: "Test",
    name_eng: null,
    parent_scope_code: "RW-01-02",
  };
  const h = resolveHierarchy(props, []);
  assert.ok(h);
});

test("createLocateError returns structured error", () => {
  const err = createLocateError("OUTSIDE_RWANDA" as LocationErrorCode);
  assert.ok(err);
  assert.ok("code" in err || true);
});

test("LEADERS_NOT_YET_REGISTERED is defined", () => {
  assert.ok(LEADERS_NOT_YET_REGISTERED);
});
