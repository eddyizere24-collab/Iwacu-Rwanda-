import assert from "node:assert/strict";
import test from "node:test";
import {
  countUnreadNotificationArchive,
  isNotificationArchiveItem,
  mergeNotificationArchive,
  type NotificationArchiveItem,
} from "./notification-archive";

const item = (
  id: string,
  createdAt: string,
  title = id,
  deliveryStatus?: string
): NotificationArchiveItem => ({
  id,
  title,
  body: "Amakuru y'aho uri",
  tag: "iwacu-location",
  createdAt,
  ...(deliveryStatus ? { deliveryStatus } : {}),
});

test("accepts complete notification archive records with valid timestamps", () => {
  assert.equal(isNotificationArchiveItem(item("one", "2026-11-08T10:00:00.000Z")), true);
  assert.equal(isNotificationArchiveItem({ ...item("one", "not-a-date") }), false);
  assert.equal(isNotificationArchiveItem({ ...item("one", "2026-11-08T10:00:00.000Z"), body: 3 }), false);
  assert.equal(isNotificationArchiveItem(null), false);
});

test("merges local and server history without duplicate event IDs", () => {
  const local = item("event-1", "2026-11-08T09:00:00.000Z", "Local copy");
  const server = item("event-1", "2026-11-08T09:00:00.000Z", "Server copy", "sent");
  const merged = mergeNotificationArchive([local], [server]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, "Server copy");
  assert.equal(merged[0].deliveryStatus, "sent");
});

test("orders notification history newest first and breaks equal-time ties deterministically", () => {
  const merged = mergeNotificationArchive(
    [
      item("a", "2026-11-08T10:00:00.000Z"),
      item("c", "2026-11-08T09:00:00.000Z"),
    ],
    [
      item("b", "2026-11-08T10:00:00.000Z"),
      item("d", "2026-11-08T11:00:00.000Z"),
    ]
  );
  assert.deepEqual(merged.map((entry) => entry.id), ["d", "b", "a", "c"]);
});

test("counts only notification records not yet opened by the visitor", () => {
  const items = [
    item("welcome", "2026-11-08T10:00:00.000Z"),
    item("boundary", "2026-11-08T10:01:00.000Z"),
    item("village", "2026-11-08T10:02:00.000Z"),
  ];
  assert.equal(countUnreadNotificationArchive(items, ["welcome", "village"]), 1);
  assert.equal(countUnreadNotificationArchive(items, ["welcome", "boundary", "village"]), 0);
  assert.equal(countUnreadNotificationArchive(items, []), 3);
});
