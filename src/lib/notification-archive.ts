export interface NotificationArchiveItem {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  deliveryStatus?: string;
}

export function isNotificationArchiveItem(value: unknown): value is NotificationArchiveItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    typeof item.tag === "string" &&
    typeof item.createdAt === "string" &&
    Number.isFinite(new Date(item.createdAt).getTime()) &&
    (item.deliveryStatus === undefined || typeof item.deliveryStatus === "string")
  );
}

export function mergeNotificationArchive(
  first: readonly NotificationArchiveItem[],
  second: readonly NotificationArchiveItem[]
): NotificationArchiveItem[] {
  const byId = new Map<string, NotificationArchiveItem>();
  for (const item of first) byId.set(item.id, item);
  for (const item of second) byId.set(item.id, item);

  return Array.from(byId.values()).sort((a, b) => {
    const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return difference !== 0 ? difference : b.id.localeCompare(a.id);
  });
}
