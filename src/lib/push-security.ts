const ALLOWED_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "web.push.apple.com",
  "push.services.mozilla.com",
]);

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return ALLOWED_PUSH_HOSTS.has(url.hostname) ||
      url.hostname.endsWith(".push.services.mozilla.com");
  } catch {
    return false;
  }
}

export function isSameOriginRequest(requestUrl: string, originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function normalizeNotificationTag(value: string): string {
  return value.normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32) || "iwacu-update";
}
