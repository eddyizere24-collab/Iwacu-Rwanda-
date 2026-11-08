import "server-only";
import webpush from "web-push";

export interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getWebPushConfig(): WebPushConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "https://iwacu-rwanda-2.vercel.app/";

  if (!publicKey || !privateKey) return null;
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(publicKey)) return null;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(privateKey)) return null;
  if (!(subject.startsWith("https://") || subject.startsWith("mailto:"))) return null;

  return { publicKey, privateKey, subject };
}

export function getWebPushPublicKey(): string | null {
  return getWebPushConfig()?.publicKey ?? null;
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; tag: string; url?: string }
): Promise<{ statusCode: number }> {
  const config = getWebPushConfig();
  if (!config) throw new Error("web_push_not_configured");

  const response = await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
      url: payload.url ?? "/",
      timestamp: Date.now(),
    }),
    {
      vapidDetails: {
        subject: config.subject,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
      },
      TTL: 600,
      urgency: "high",
      topic: payload.tag.slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, "-"),
      timeout: 8_000,
    }
  );

  return { statusCode: response.statusCode ?? 201 };
}
