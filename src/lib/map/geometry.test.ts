import assert from "node:assert/strict";
import test from "node:test";
import { findVillageAt, isInsideRwandaWindow, pointInGeometry } from "./geometry";

const square = { type: "Polygon", coordinates: [[[30, -2], [31, -2], [31, -1], [30, -1], [30, -2]]] };
const holed = {
  type: "Polygon",
  coordinates: [
    [[30, -2], [31, -2], [31, -1], [30, -1], [30, -2]],
    [[30.4, -1.6], [30.6, -1.6], [30.6, -1.4], [30.4, -1.4], [30.4, -1.6]],
  ],
};

test("point in polygon respects edges and holes", () => {
  assert.equal(pointInGeometry(30.2, -1.2, square), true);
  assert.equal(pointInGeometry(29.5, -1.2, square), false);
  assert.equal(pointInGeometry(30.5, -1.5, holed), false);
  assert.equal(pointInGeometry(30.2, -1.8, holed), true);
});

test("multipolygons match any part and bad input never throws", () => {
  const multi = { type: "MultiPolygon", coordinates: [square.coordinates, [[[28.8, -2.5], [29, -2.5], [29, -2.3], [28.8, -2.3], [28.8, -2.5]]]] };
  assert.equal(pointInGeometry(28.9, -2.4, multi), true);
  assert.equal(pointInGeometry(1, 1, null), false);
  assert.equal(pointInGeometry(1, 1, { type: "Point", coordinates: [1, 1] }), false);
});

test("finds the village containing a point", () => {
  const features = [
    { geometry: holed, properties: { scope_code: "A" } },
    { geometry: { type: "Polygon", coordinates: [[[30.4, -1.6], [30.6, -1.6], [30.6, -1.4], [30.4, -1.4], [30.4, -1.6]]] }, properties: { scope_code: "B" } },
  ];
  assert.equal(findVillageAt(30.5, -1.5, features)?.properties?.scope_code, "B");
  assert.equal(findVillageAt(50, 50, features), null);
});

test("Rwanda window check", () => {
  assert.equal(isInsideRwandaWindow(-1.94, 30.06), true);
  assert.equal(isInsideRwandaWindow(10, 10), false);
  assert.equal(isInsideRwandaWindow(NaN, 30), false);
});
