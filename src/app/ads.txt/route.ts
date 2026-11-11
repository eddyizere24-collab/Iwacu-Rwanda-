export const dynamic = "force-dynamic";

export function GET() {
  const configuredPublisher = process.env.ADSENSE_PUBLISHER_ID;
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
  const fallbackPublisher = client.startsWith("ca-pub-") ? "pub-" + client.slice("ca-pub-".length) : "";
  const publisher = configuredPublisher || fallbackPublisher;

  if (!publisher || !/^pub-\d{16}$/.test(publisher)) {
    return new Response("AdSense publisher is not configured.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new Response("google.com, " + publisher + ", DIRECT, f08c47fec0942fa0\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
